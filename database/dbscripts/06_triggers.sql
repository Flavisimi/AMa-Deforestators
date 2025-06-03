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
        
        if(:new.name != :old.name 
            or :new.short_expansion != :new.short_expansion
            or :new.description != :new.description) then
            :new.approval_status := 'pending';
        end if;
    end before each row;

    after each row is
    begin
        if(:new.name != :old.name 
            or :new.short_expansion != :new.short_expansion
            or :new.description != :new.description) then
            delete from votes where meaning_id = :new.id;
        end if;
    end after each row;
end;

/

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

create or replace trigger abbr_list_insert
before insert on abbr_lists
for each row
begin
    if(:new.id is null) then
        :new.id := seq_list.nextval;
    end if;

    if(:new.created_at is null) then
        :new.created_at := sysdate;
    end if;

    if(:new.updated_at is null) then
        :new.updated_at := sysdate;
    end if;
end;


/

create or replace trigger abbr_list_contents_delete
for delete on abbr_list_contents
compound trigger
    type id_list is table of integer index by pls_integer;
    v_affected_lists id_list;

    after each row is
    begin
        v_affected_lists(:old.list_id) := 1;
    end after each row;

    after statement is
        cursor list_entries(v_list_id integer) is select * from abbr_list_contents where list_id = v_list_id order by list_index asc for update of list_index nowait; 
        v_list_id integer;
        v_index integer;
    begin
        if(v_affected_lists.count > 0) then
            v_list_id := v_affected_lists.first;
            while v_list_id is not null loop
                v_index := 0;
                for v_entry in list_entries(v_list_id) loop
                    update abbr_list_contents set list_index = v_index where list_id = v_list_id and list_index = v_entry.list_index;
                    v_index := v_index + 1;
                end loop;

                update abbr_lists set updated_at = sysdate where id = v_list_id;
                v_list_id := v_affected_lists.next(v_list_id);
            end loop;
        end if;
    end after statement;
end;

/

create or replace trigger abbr_list_contents_insert
for insert on abbr_list_contents
compound trigger
    before each row is
        v_index integer;
        v_count integer;
    begin
        select count(*) into v_count from abbr_list_contents where list_id = :new.list_id;
        if(v_count = 0) then
            v_index := 0;
        else
            select max(list_index) into v_index from abbr_list_contents where list_id = :new.list_id;
            v_index := v_index + 1;
        end if;

        :new.list_index := v_index;
    end before each row;

    after each row is
    begin
        update abbr_lists set updated_at = sysdate where id = :new.list_id;
    end after each row;
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

    insert into meanings values(null, v_abbr_id, :new.name, :new.short_expansion, :new.description, :new.uploader_id, 'pending', :new.lang, :new.domain, null, null);
end;

/

create or replace trigger vote_trigger
for insert or delete or update on votes
compound trigger
    type id_list is table of integer index by pls_integer;
    v_meanings id_list;
    
    after each row is
    begin
        if(DELETING) then
            v_meanings(:old.meaning_id) := 1;
        elsif(UPDATING) then
            v_meanings(:old.meaning_id) := 1;
            v_meanings(:new.meaning_id) := 1;
        else
            v_meanings(:new.meaning_id) := 1;
        end if;
    end after each row;

    after statement is
        v_meaning_id integer;
        v_score integer;
    begin
        if(v_meanings.count > 0) then
            v_meaning_id := v_meanings.first;

            while v_meaning_id is not null loop
                v_score := 0;
                select sum(vote) into v_score from votes where meaning_id = v_meaning_id;
                
                if(v_score <= -100) then
                    update meanings set approval_status = 'rejected' where id = v_meaning_id;
                end if;

                if(v_score >= 100) then
                    update meanings set approval_status = 'approved' where id = v_meaning_id;
                end if;

                v_meaning_id := v_meanings.next(v_meaning_id);
            end loop;
        end if;
    end after statement;
end;

/

commit;