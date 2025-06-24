drop view domains;
drop view languages;
drop view combined_view;

drop table abbr_list_contents;
drop table abbr_lists;
drop table visit_logs;
drop table votes;
drop table meanings;
drop table abbreviations;
drop table users;

commit;

create table users(
    id integer primary key, 
    name varchar2(30) unique not null,
    user_password varchar2(255) not null,
    role varchar2(10) not null, --USER pentru utilizator de rand sau ADMIN cu permisiuni
    created_at date not null,
    updated_at date not null,
    profile_picture blob,
    email varchar2(50) unique not null,
    description  varchar(256),
    date_of_birth date
);

-- "AMa" and "AMA" both are linked to an abbreviation with searchable_name "AMA"
create table abbreviations(
    id integer primary key,
    searchable_name varchar2(30) unique not null,
    meaning_count integer not null,
    created_at date not null,
    updated_at date not null
);

create table meanings(
    id integer primary key,
    abbr_id integer references abbreviations(id) on delete cascade not null,
    name varchar2(30) not null,
    short_expansion varchar2(256) unique not null,
    uploader_id integer references users(id) on delete cascade not null,
    approval_status varchar2(50) not null, -- pending, accepted, rejected, manual
    lang varchar2(3) not null,
    domain varchar2(30) not null,
    created_at date not null,
    updated_at date not null
);

create table votes(
    voter_id integer references users(id) on delete cascade not null,
    meaning_id integer references meanings(id) on delete cascade not null,
    vote number(1,0) not null, -- 1 sau -1
    vote_date date not null,
    constraint vote_uq_ids unique(voter_id, meaning_id)
);

create table abbr_lists(
    id integer primary key,
    creator_id integer references users(id) on delete cascade not null,
    name varchar(50) unique not null,
    private number(1, 0) not null,
    created_at date not null,
    updated_at date not null
);

create table abbr_list_contents(
    list_id integer references abbr_lists(id) on delete cascade not null,
    meaning_id integer references meanings(id) on delete cascade not null,
    list_index integer not null,
    constraint abbr_list_only_once unique(list_id, meaning_id)
);

create table visit_logs(
    visitor_id integer references users(id) on delete set null, --if this column is null then a guest (not logged in user) visited the abbreviation
    abbr_id integer references users(id) on delete cascade not null,
    visit_date date not null
);

create view languages as select unique lang from meanings;
create view domains as select unique domain from meanings;

create view combined_view(name, short_expansion, lang, domain, uploader_id, created_at, updated_at) as select name, short_expansion, lang, domain, uploader_id, created_at, updated_at from meanings;

create index votes_by_voter on votes(voter_id);
create index votes_by_meaning on votes(meaning_id);

create index meanings_by_uploader on meanings(uploader_id);
create index meanings_by_abbreviation on meanings(abbr_id);

create index lists_by_creator on abbr_lists(creator_id);


commit;
