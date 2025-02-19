CREATE TABLE application(user_id varchar NOT NULL, msg_id varchar NOT NULL, discord_user varchar, roblox_user varchar, roblox_avatar_url varchar, pending_msg_id varchar, age integer, kill integer, win integer, roblox_headshot_url varchar, PRIMARY KEY(user_id,msg_id));
CREATE TABLE config(id integer NOT NULL, app_open boolean);
CREATE TABLE warn_type(id SERIAL NOT NULL, name varchar NOT NULL, description text, created_at timestamp with time zone NOT NULL DEFAULT now(), PRIMARY KEY(id));
CREATE INDEX idx_user_warn_type ON user_warn USING btree ("warn_type_id");
CREATE TABLE user_warn(id SERIAL NOT NULL, user_id varchar NOT NULL, requirement integer NOT NULL, earned integer NOT NULL, diff integer GENERATED ALWAYS AS (requirement - earned) STORED, created_at timestamp with time zone NOT NULL DEFAULT now(), issuer_id varchar NOT NULL, warn_type_id integer NOT NULL, PRIMARY KEY(id), CONSTRAINT user_warn_new_warn_type_id_fkey FOREIGN key(warn_type_id) REFERENCES warn_type(id), CONSTRAINT check_positive_values CHECK (((requirement >= 0) AND (earned >= 0))));
CREATE INDEX idx_user_warn_userid ON user_warn USING btree ("user_id");
CREATE OR REPLACE FUNCTION public.close_applications() RETURNS void LANGUAGE plpgsql AS $function$ BEGIN UPDATE config SET app_open = FALSE WHERE id = 1; END; $function$;
CREATE OR REPLACE FUNCTION public.open_applications() RETURNS void LANGUAGE plpgsql AS $function$ BEGIN UPDATE config SET app_open = TRUE WHERE id = 1; END; $function$;
INSERT INTO config (id, app_open) VALUES (1, TRUE);