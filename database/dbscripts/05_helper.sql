create or replace package ama_helper as
    function get_searchable_name(v_name varchar2) return varchar2 deterministic;
end ama_helper;

/

create or replace package body ama_helper as
    function get_searchable_name(v_name varchar2) return varchar2 deterministic as
        v_out_str varchar2(30);
        v_char char;
    begin
        v_out_str := upper(v_name);
        v_out_str := translate(v_out_str, 'ĂÎÂȘȚ 0123456789!@#$%^&*(),./;''[]-=<>?:"{}|_+', 'AIAST');
        return v_out_str;
    end;
end ama_helper;

/

commit;