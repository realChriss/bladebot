CREATE TABLE public.warn_type (id SERIAL NOT NULL, name varchar NOT NULL, description text, created_at timestamp with time zone NOT NULL DEFAULT now(), PRIMARY KEY(id));
INSERT INTO public.warn_type (id, name, description) VALUES (1, 'ap', 'Activity Points related warning');
INSERT INTO public.warn_type (id, name, description) VALUES (2, 'donation', 'Donation related warning');
CREATE TABLE public.user_warn (id SERIAL NOT NULL, user_id varchar NOT NULL, requirement integer NOT NULL, earned integer NOT NULL, diff integer GENERATED ALWAYS AS (requirement - earned) STORED, created_at timestamp with time zone NOT NULL DEFAULT now(), issuer_id varchar NOT NULL, warn_type_id integer NOT NULL, PRIMARY KEY(id), CONSTRAINT user_warn_new_warn_type_id_fkey FOREIGN KEY(warn_type_id) REFERENCES public.warn_type(id), CONSTRAINT check_positive_values CHECK (requirement >= 0 AND earned >= 0));
CREATE INDEX idx_user_warn_type ON public.user_warn USING btree (warn_type_id);
CREATE INDEX idx_user_warn_userid ON public.user_warn USING btree (user_id);
CREATE TABLE public.application (user_id varchar NOT NULL, msg_id varchar NOT NULL, discord_user varchar, roblox_user varchar, roblox_avatar_url varchar, roblox_headshot_url varchar, pending_msg_id varchar, age integer, kill integer, win integer, PRIMARY KEY(user_id, msg_id));
CREATE TABLE public.config (id integer NOT NULL, app_open boolean, send_wlc_msg PRIMARY KEY(id));
INSERT INTO public.config (id, app_open, send_wlc_msg) VALUES (1, TRUE, FALSE);