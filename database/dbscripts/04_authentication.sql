set SERVEROUTPUT on;
create or replace package auth_package as
    function validate_login(p_username in varchar2, p_password in varchar2) return number;
    function hash_password(p_password in varchar2) return varchar2;
    procedure register_user(p_username in varchar2, p_password in varchar2, p_email in varchar2, p_user_id out number);
end auth_package;
/
create or replace package body auth_package as

    function hash_password(p_password in varchar2) return varchar2 is
        v_raw RAW(32);
    begin
        v_raw := DBMS_CRYPTO.HASH(UTL_I18N.STRING_TO_RAW(p_password, 'AL32UTF8'), DBMS_CRYPTO.HASH_SH1);
        return RAWTOHEX(v_raw);
    end hash_password;

    function validate_login(p_username in varchar2, p_password in varchar2) return number is
        v_user_id number;
        v_hashed_password varchar2(255);
        v_check_user number:=0;
    begin
        v_hashed_password := hash_password(p_password);
        select count(*) into v_check_user from users where name = p_username;
        select id into v_user_id from users where name = p_username and user_password = v_hashed_password;
        return v_user_id;
    exception
        when NO_DATA_FOUND then
            if v_check_user=0 then
                RAISE_APPLICATION_ERROR(-20003, 'User does not exist');
            else  
                RAISE_APPLICATION_ERROR(-20004, 'Incorrect password');
            end if;
    end validate_login;

    procedure register_user(p_username in varchar2, p_password in varchar2, p_email in varchar2, p_user_id out number) is
        v_count number;
        v_hashed_password varchar2(255);
    begin
        select count(*) into v_count from users where name = p_username;
        if v_count > 0 then
            RAISE_APPLICATION_ERROR(-20001, 'Username already exists');
        end if;

        select count(*) into v_count from users where email = p_email;
        if v_count > 0 then
            RAISE_APPLICATION_ERROR(-20002, 'Email already exists');
        end if;

        v_hashed_password := hash_password(p_password);
        insert into users(id, name, user_password, email, created_at,role,updated_at)
        values (seq_user.NEXTVAL, p_username, v_hashed_password, p_email, CURRENT_DATE,'USER',CURRENT_DATE)
        returning id into p_user_id;
    end register_user; 

end auth_package;
/
commit;
