create or replace package ama_helper as
    function get_searchable_name(v_name varchar2) return varchar2 deterministic;
end ama_helper;

/

create or replace package body ama_helper as
    function get_searchable_name(v_name varchar2) return varchar2 deterministic as

    begin
        return 'TEMP';
    end;
end ama_helper;

/

commit;