ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT AMA/AMA@localhost:1521/FREEPDB1;
create sequence seq_user start with 1 increment by 1;
commit;
