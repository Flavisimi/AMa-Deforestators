ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT AMA/AMA@localhost:1521/FREEPDB1;
create table abbreviation(
    id integer primary key,
    name varchar2(30) not null
);
create table users(
    id number primary key, 
    name varchar2(30) not null,
    user_password varchar2(255) not null,
    role varchar2(10),
    created_at date,
    profile_picture blob,
    email varchar2(50)
);
commit;
