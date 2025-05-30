drop view domains;
drop view languages;
drop table votes;
drop table meanings;
drop table abbreviations;
drop table users;

commit;

create table users(
    id integer primary key, 
    name varchar2(30) not null,
    user_password varchar2(255) not null,
    role varchar2(10) not null, --USER pentru utilizator de rand sau ADMIN cu permisiuni
    created_at date not null,
    profile_picture blob,
    email varchar2(50) unique not null
);

create table abbreviations(
    id integer primary key,
    name varchar2(30) unique not null,
    searchable_name varchar2(30) not null
);

create table meanings(
    id integer primary key,
    abbr_id integer references abbreviations(id) not null,
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
    vote number(1,0) -- 1 sau -1
);

create view languages as select unique lang from meanings;
create view domains as select unique domain from meanings;

commit;
