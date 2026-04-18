-- ============================================================
-- AmanahOS Initial Schema — Growth Track (Mudaraba)
-- Islamic Kickstarter: profit-sharing campaigns
-- Run in Supabase SQL editor or via: supabase db push
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM ('member', 'founder', 'admin');

CREATE TYPE public.kyc_status AS ENUM ('pending', 'in_review', 'approved', 'rejected');

CREATE TYPE public.campaign_status AS ENUM (
  'draft', 'pending_review', 'live', 'funded',
  'in_progress', 'profit_reporting', 'completed', 'failed'
);

-- Only two system wallets needed: escrow (holds investor funds) and stripe_holding (tracks Stripe balance)
CREATE TYPE public.account_type AS ENUM (
  'user_wallet', 'platform_escrow', 'stripe_holding'
);

CREATE TYPE public.tx_direction AS ENUM ('debit', 'credit');

CREATE TYPE public.tx_type AS ENUM (
  'deposit', 'withdrawal',
  'investment', 'divestment',
  'profit_distribution', 'platform_fee', 'refund'
);

-- ────────────────────────────────────────────────────────────
-- USERS (extends auth.users 1:1)
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  display_name        TEXT,
  role                public.user_role NOT NULL DEFAULT 'member',
  stripe_account_id   TEXT UNIQUE,   -- Express connected account (receives payouts)
  stripe_customer_id  TEXT UNIQUE,   -- for card charges
  avatar_url          TEXT,
  phone               TEXT,
  country_code        CHAR(2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role           ON public.users(role);
CREATE INDEX idx_users_stripe_account ON public.users(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: owner select"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: admin select"
  ON public.users FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "users: owner update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users: service role all"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-create users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- KYC VERIFICATIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.kyc_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status              public.kyc_status NOT NULL DEFAULT 'pending',
  stripe_session_id   TEXT UNIQUE,
  stripe_report_id    TEXT,
  document_type       TEXT,
  document_country    CHAR(2),
  reviewer_id         UUID REFERENCES public.users(id),
  rejection_reason    TEXT,
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_kyc_user   ON public.kyc_verifications(user_id);
CREATE INDEX        idx_kyc_status ON public.kyc_verifications(status);

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc: owner select"
  ON public.kyc_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "kyc: admin select"
  ON public.kyc_verifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "kyc: service role all"
  ON public.kyc_verifications FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- WALLETS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.wallets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,  -- NULL for system wallets
  account_type public.account_type NOT NULL DEFAULT 'user_wallet',
  currency     CHAR(3) NOT NULL DEFAULT 'USD',
  is_frozen    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallets_user ON public.wallets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_wallets_type ON public.wallets(account_type);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets: owner select"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "wallets: admin select"
  ON public.wallets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "wallets: service role all"
  ON public.wallets FOR ALL
  USING (auth.role() = 'service_role');

-- Seed the two system wallets (no user_id)
INSERT INTO public.wallets (account_type) VALUES
  ('platform_escrow'),
  ('stripe_holding');

-- Auto-create wallet when a user row is created
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, account_type)
  VALUES (NEW.id, 'user_wallet');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

-- ────────────────────────────────────────────────────────────
-- TRANSACTIONS (immutable double-entry ledger)
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id),
  direction       public.tx_direction NOT NULL,
  tx_type         public.tx_type NOT NULL,
  amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  reference_id    UUID,
  reference_type  TEXT,   -- 'campaign' | 'investment' | 'profit_distribution'
  stripe_pi_id    TEXT,
  stripe_tx_id    TEXT,
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES public.users(id)
  -- NO updated_at — immutable
);

CREATE INDEX idx_tx_wallet_created ON public.transactions(wallet_id, created_at DESC);
CREATE INDEX idx_tx_reference      ON public.transactions(reference_id, reference_type) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_tx_type           ON public.transactions(tx_type);
CREATE INDEX idx_tx_stripe_pi      ON public.transactions(stripe_pi_id) WHERE stripe_pi_id IS NOT NULL;

-- Immutability: block all UPDATE and DELETE
CREATE OR REPLACE FUNCTION public.prevent_tx_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'transactions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_transactions
  BEFORE UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tx_mutation();

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions: owner select"
  ON public.transactions FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
  );

CREATE POLICY "transactions: admin select"
  ON public.transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "transactions: service role insert"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Balance view (computed, never stored)
CREATE OR REPLACE VIEW public.wallet_balances AS
SELECT
  wallet_id,
  currency,
  SUM(CASE WHEN direction = 'credit' THEN amount_cents ELSE -amount_cents END) AS balance_cents
FROM public.transactions
GROUP BY wallet_id, currency;

-- ────────────────────────────────────────────────────────────
-- CAMPAIGNS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.campaigns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id            UUID NOT NULL REFERENCES public.users(id),
  title                 TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  slug                  TEXT UNIQUE NOT NULL,
  description           TEXT NOT NULL,
  business_plan_url     TEXT,   -- Supabase Storage URL
  sector                TEXT,
  target_amount_cents   BIGINT NOT NULL CHECK (target_amount_cents >= 1000000),   -- min $10k
  raised_amount_cents   BIGINT NOT NULL DEFAULT 0,
  min_investment_cents  BIGINT NOT NULL DEFAULT 10000,                            -- min $100
  profit_share_pct      NUMERIC(5,2) NOT NULL CHECK (profit_share_pct BETWEEN 1 AND 99),
  profit_interval       TEXT NOT NULL DEFAULT 'milestone'
                        CHECK (profit_interval IN ('monthly','quarterly','milestone')),
  duration_months       SMALLINT NOT NULL CHECK (duration_months BETWEEN 1 AND 60),
  status                public.campaign_status NOT NULL DEFAULT 'draft',
  stripe_product_id     TEXT,
  escrow_wallet_id      UUID REFERENCES public.wallets(id),
  funded_at             TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  review_notes          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_founder ON public.campaigns(founder_id);
CREATE INDEX idx_campaigns_status  ON public.campaigns(status);
CREATE INDEX idx_campaigns_slug    ON public.campaigns(slug);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns: public read live"
  ON public.campaigns FOR SELECT
  USING (status IN ('live','funded','in_progress','profit_reporting','completed','failed'));

CREATE POLICY "campaigns: founder read own"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = founder_id);

CREATE POLICY "campaigns: admin read all"
  ON public.campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "campaigns: founder insert"
  ON public.campaigns FOR INSERT
  WITH CHECK (
    auth.uid() = founder_id AND
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('founder','admin'))
  );

CREATE POLICY "campaigns: founder update own draft"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = founder_id AND status = 'draft');

CREATE POLICY "campaigns: service role all"
  ON public.campaigns FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- INVESTMENTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.investments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES public.campaigns(id),
  investor_id      UUID NOT NULL REFERENCES public.users(id),
  amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),
  profit_share_pct NUMERIC(5,2) NOT NULL,   -- snapshot at time of investment
  stripe_pi_id     TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','captured','refunded','active','exited')),
  refunded_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_investments_campaign_investor ON public.investments(campaign_id, investor_id);
CREATE INDEX idx_investments_investor  ON public.investments(investor_id);
CREATE INDEX idx_investments_campaign  ON public.investments(campaign_id);
CREATE INDEX idx_investments_stripe_pi ON public.investments(stripe_pi_id);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investments: investor read own"
  ON public.investments FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY "investments: founder read campaign investors"
  ON public.investments FOR SELECT
  USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE founder_id = auth.uid())
  );

CREATE POLICY "investments: admin read all"
  ON public.investments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "investments: service role all"
  ON public.investments FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- PROFIT DISTRIBUTIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.profit_distributions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID NOT NULL REFERENCES public.campaigns(id),
  period_label        TEXT NOT NULL,
  gross_profit_cents  BIGINT NOT NULL CHECK (gross_profit_cents > 0),
  platform_fee_cents  BIGINT NOT NULL DEFAULT 0,
  net_profit_cents    BIGINT GENERATED ALWAYS AS (gross_profit_cents - platform_fee_cents) STORED,
  reported_by         UUID NOT NULL REFERENCES public.users(id),
  approved_by         UUID REFERENCES public.users(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','distributing','distributed','disputed')),
  distribution_date   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profit_dist_campaign ON public.profit_distributions(campaign_id);
CREATE INDEX idx_profit_dist_status   ON public.profit_distributions(status);

ALTER TABLE public.profit_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profit_dist: investors and founder read"
  ON public.profit_distributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investments i
      WHERE i.campaign_id = profit_distributions.campaign_id
        AND i.investor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = profit_distributions.campaign_id
        AND c.founder_id = auth.uid()
    )
  );

CREATE POLICY "profit_dist: admin read all"
  ON public.profit_distributions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "profit_dist: founder insert"
  ON public.profit_distributions FOR INSERT
  WITH CHECK (
    auth.uid() = reported_by AND
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = profit_distributions.campaign_id AND c.founder_id = auth.uid()
    )
  );

CREATE POLICY "profit_dist: service role all"
  ON public.profit_distributions FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- PLATFORM CONFIG
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.platform_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES public.users(id)
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_config: authenticated read"
  ON public.platform_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "platform_config: service role all"
  ON public.platform_config FOR ALL
  USING (auth.role() = 'service_role');

INSERT INTO public.platform_config (key, value, description) VALUES
  ('growth_platform_fee_pct',     '2.5',  'Percentage of gross profit taken by platform on distributions'),
  ('kyc_required_for_investment', 'true', 'KYC must be approved before investing'),
  ('stripe_application_fee_pct',  '1.5',  'Percentage charged as Stripe application fee on investment captures'),
  ('min_campaign_target_cents',   '1000000', 'Minimum campaign target ($10,000)'),
  ('min_investment_cents',        '10000',   'Minimum investment amount ($100)');

-- ────────────────────────────────────────────────────────────
-- STRIPE EVENTS (webhook dedup)
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.stripe_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_events: service role only"
  ON public.stripe_events FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- AUDIT LOG
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   UUID NOT NULL,
  payload     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_target ON public.audit_log(target_type, target_id);
CREATE INDEX idx_audit_actor  ON public.audit_log(actor_id);
CREATE INDEX idx_audit_action ON public.audit_log(action);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log: admin read"
  ON public.audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "audit_log: service role all"
  ON public.audit_log FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- LEDGER STORED PROCEDURES
-- All money movement goes through these — atomic, SECURITY DEFINER
-- ────────────────────────────────────────────────────────────

-- Deposit: stripe card payment captured → user wallet credited
CREATE OR REPLACE FUNCTION public.ledger_deposit(
  p_user_wallet   UUID,
  p_stripe_wallet UUID,
  p_amount_cents  BIGINT,
  p_stripe_pi_id  TEXT,
  p_actor_id      UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.transactions(wallet_id, direction, tx_type, amount_cents, stripe_pi_id, created_by)
  VALUES
    (p_stripe_wallet, 'debit',  'deposit', p_amount_cents, p_stripe_pi_id, p_actor_id),
    (p_user_wallet,   'credit', 'deposit', p_amount_cents, p_stripe_pi_id, p_actor_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Investment: user wallet → platform escrow
CREATE OR REPLACE FUNCTION public.ledger_invest(
  p_investor_wallet UUID,
  p_escrow_wallet   UUID,
  p_amount_cents    BIGINT,
  p_campaign_id     UUID,
  p_investment_id   UUID,
  p_stripe_pi_id    TEXT,
  p_actor_id        UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.transactions(wallet_id, direction, tx_type, amount_cents, reference_id, reference_type, stripe_pi_id, created_by)
  VALUES
    (p_investor_wallet, 'debit',  'investment', p_amount_cents, p_investment_id, 'investment', p_stripe_pi_id, p_actor_id),
    (p_escrow_wallet,   'credit', 'investment', p_amount_cents, p_investment_id, 'investment', p_stripe_pi_id, p_actor_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Milestone release: escrow → stripe_holding (Stripe Transfer to founder happens before this)
CREATE OR REPLACE FUNCTION public.ledger_milestone_release(
  p_escrow_wallet  UUID,
  p_stripe_wallet  UUID,
  p_amount_cents   BIGINT,
  p_campaign_id    UUID,
  p_stripe_tx_id   TEXT,
  p_actor_id       UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.transactions(wallet_id, direction, tx_type, amount_cents, reference_id, reference_type, stripe_tx_id, created_by)
  VALUES
    (p_escrow_wallet, 'debit',  'divestment', p_amount_cents, p_campaign_id, 'campaign', p_stripe_tx_id, p_actor_id),
    (p_stripe_wallet, 'credit', 'divestment', p_amount_cents, p_campaign_id, 'campaign', p_stripe_tx_id, p_actor_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profit distribution: escrow → investor wallet (net) + platform fee pair
CREATE OR REPLACE FUNCTION public.ledger_profit_distribute(
  p_escrow_wallet    UUID,
  p_investor_wallet  UUID,
  p_net_cents        BIGINT,
  p_fee_cents        BIGINT,
  p_distribution_id  UUID,
  p_stripe_tx_id     TEXT,
  p_actor_id         UUID
) RETURNS VOID AS $$
BEGIN
  -- Investor net share
  INSERT INTO public.transactions(wallet_id, direction, tx_type, amount_cents, reference_id, reference_type, stripe_tx_id, created_by)
  VALUES
    (p_escrow_wallet,   'debit',  'profit_distribution', p_net_cents, p_distribution_id, 'profit_distribution', p_stripe_tx_id, p_actor_id),
    (p_investor_wallet, 'credit', 'profit_distribution', p_net_cents, p_distribution_id, 'profit_distribution', p_stripe_tx_id, p_actor_id);

  -- Platform fee (only if non-zero)
  IF p_fee_cents > 0 THEN
    INSERT INTO public.transactions(wallet_id, direction, tx_type, amount_cents, reference_id, reference_type, created_by)
    VALUES
      (p_escrow_wallet, 'debit',  'platform_fee', p_fee_cents, p_distribution_id, 'profit_distribution', p_actor_id),
      (p_escrow_wallet, 'credit', 'platform_fee', p_fee_cents, p_distribution_id, 'profit_distribution', p_actor_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refund: escrow → stripe_holding (stripe.refunds.create() fires before this)
CREATE OR REPLACE FUNCTION public.ledger_refund(
  p_escrow_wallet   UUID,
  p_stripe_wallet   UUID,
  p_amount_cents    BIGINT,
  p_investment_id   UUID,
  p_stripe_pi_id    TEXT,
  p_actor_id        UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.transactions(wallet_id, direction, tx_type, amount_cents, reference_id, reference_type, stripe_pi_id, created_by)
  VALUES
    (p_escrow_wallet,  'debit',  'refund', p_amount_cents, p_investment_id, 'investment', p_stripe_pi_id, p_actor_id),
    (p_stripe_wallet,  'credit', 'refund', p_amount_cents, p_investment_id, 'investment', p_stripe_pi_id, p_actor_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
