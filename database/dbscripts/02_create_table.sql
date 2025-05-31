drop view domains;
drop view languages;
drop view combined_view;

drop table abbr_list_contents;
drop table abbr_list;
drop table visit_log;
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
    email varchar2(50) unique not null
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
    abbr_id integer references abbreviations(id) not null,
    name varchar2(30) not null,
    short_expansion varchar2(256) unique not null,
    uploader_id integer references users(id) not null,
    approval_status varchar2(50) not null, -- pending, accepted, rejected, manual
    lang varchar2(3) not null,
    domain varchar2(30) not null,
    created_at date not null,
    updated_at date not null
);

create table votes(
    voter_id integer references users(id) not null,
    meaning_id integer references meanings(id) not null,
    vote number(1,0) not null, -- 1 sau -1
    vote_date date not null
);

create table abbr_list(
    id integer primary key,
    creator_id integer references users(id) not null,
    name varchar(50) not null,
    private number(1, 0) not null,
    created_at date not null,
    updated_at date not null
);

create table abbr_list_contents(
    list_id integer references abbr_list(id) not null,
    meaning_id integer references meanings(id) not null,
    list_index integer not null
);

create table visit_log(
    visitor_id integer references users(id) not null,
    abbr_id integer references users(id) not null,
    visit_date date not null
);

create view languages as select unique lang from meanings;
create view domains as select unique domain from meanings;

create view combined_view(name, short_expansion, lang, domain, uploader_id, created_at, updated_at) as select name, short_expansion, lang, domain, uploader_id, created_at, updated_at from meanings;

commit;
