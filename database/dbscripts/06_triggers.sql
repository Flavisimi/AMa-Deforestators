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
end;

/

create or replace trigger meaning_insert
before insert on meanings
for each row
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
end;

/

create or replace trigger combined_insert
instead of insert on combined_view
for each row
declare
    v_abbr_id integer;
    v_count integer;
begin
    select count(*) into v_count from abbreviations where name = :new.name;
    if(v_count = 0) then
        insert into abbreviations values(null, :new.name, ama_helper.get_searchable_name(:new.name), null, null);
    end if;
    select id into v_abbr_id from abbreviations where name = :new.name;

    insert into meanings values(null, v_abbr_id, :new.short_expansion, :new.uploader_id, 'pending', :new.lang, :new.domain, null, null);
end;

/

commit;