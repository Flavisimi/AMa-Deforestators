drop sequence seq_user;
drop sequence seq_abbreviations;
drop sequence seq_meanings;

create sequence seq_user start with 1 increment by 1 minvalue 1 nomaxvalue;
create sequence seq_abbreviations start with 1 increment by 1 minvalue 1 nomaxvalue;
create sequence seq_meanings start with 1 increment by 1 minvalue 1 nomaxvalue;

commit;
