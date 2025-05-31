create or replace trigger abbrev_insert
before insert on abbreviations
for each row
begin
    if(:new.id is null) then
        :new.id := seq_abbreviations.nextval;
    end if;

    if(:new.created_at is null) then
        :new.created_at := sysdate;
    end if;

    if(:new.updated_at is null) then
        :new.updated_at := sysdate;
    end if;

    :new.meaning_count := 0;
end;

/

create or replace trigger meaning_insert
for insert on meanings
compound trigger
    before each row is
    begin
        if(:new.id is null) then
            :new.id := seq_meanings.nextval;
        end if;

        if(:new.created_at is null) then
            :new.created_at := sysdate;
        end if;

        if(:new.updated_at is null) then
            :new.updated_at := sysdate;
        end if;
    end before each row;

    after each row is
    begin
        update abbreviations set meaning_count = meaning_count + 1 where id = :new.abbr_id;
    end after each row;
end;

/

create or replace trigger meaning_update
for update on meanings
compound trigger
    before each row is
        v_old_searchable_name varchar2(30);
        v_new_searchable_name varchar2(30);
    begin
        if(:old.id != :new.id or :old.abbr_id != :new.abbr_id) then
            raise_application_error(-20101, 'Cannot modify id or abbreviation id of meaning');
        end if;
        
        v_old_searchable_name := ama_helper.GET_SEARCHABLE_NAME(:old.name);
        v_new_searchable_name := ama_helper.GET_SEARCHABLE_NAME(:new.name);

        if(v_old_searchable_name != v_new_searchable_name) then
            raise_application_error(-20100, 'Cannot modify abbreviation name to mean something else');
        end if;
        
        :new.approval_status := 'pending';
    end before each row;

    after each row is
    begin
        delete from votes where meaning_id = :new.id;
    end after each row;
end;

/

--delete abbreviations that have no meanings
-- create or replace trigger meaning_delete
-- for delete on meanings
-- compound trigger
--     type id_list is table of integer index by integer;
--     v_abbr_ids id_list;

--     before statement is
--     begin
--         v_ids := id_list();
--     end before statement;

--     after each row is
--     begin
--         v_ids(:old.abbr_id) := 1;
--     end after each row;

--     after statement is
--         v_index integer;
--         v_count integer;
--     begin
--         if(v_ids.count > 0) then
--             v_index := v_ids.first;
--             loop

--                 exit when v_index = v_ids.last;
--                 v_index := v_ids.next(v_index);
--             end loop;
--         end if;
--     end after statement;     
-- end;

-- /

create or replace trigger meaning_delete
after delete on meanings
for each row
declare
    v_count integer;
begin
    select meaning_count into v_count from abbreviations where id = :old.abbr_id;
    if(v_count = 1) then
        delete from abbreviations where id = :old.abbr_id;
    else
        update abbreviations set meaning_count = meaning_count - 1 where id = :old.abbr_id;
    end if;
end;

/

create or replace trigger combined_insert
instead of insert on combined_view
for each row
declare
    v_abbr_id integer;
    v_count integer;
    v_searchable_name varchar2(30);
begin
    v_searchable_name := ama_helper.get_searchable_name(:new.name);

    select count(*) into v_count from abbreviations where searchable_name = v_searchable_name;
    if(v_count = 0) then
        insert into abbreviations values(null, v_searchable_name, null, null, null);
    end if;
    select id into v_abbr_id from abbreviations where searchable_name = v_searchable_name;

    insert into meanings values(null, v_abbr_id, :new.name, :new.short_expansion, :new.uploader_id, 'pending', :new.lang, :new.domain, null, null);
end;

/

commit;