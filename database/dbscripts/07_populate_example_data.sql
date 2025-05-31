declare
    v_id integer;
begin
    insert into users values(seq_user.nextval, 'admin', auth_package.hash_password('admin_test'), 'ADMIN', sysdate, sysdate, null, 'admin@ama.io');
    insert into users values(seq_user.nextval, 'user1', auth_package.hash_password('user1_test'), 'USER', sysdate, sysdate, null, 'user1@ama.io');
    insert into users values(seq_user.nextval, 'user2', auth_package.hash_password('user2_test'), 'USER', sysdate, sysdate, null, 'user2@ama.io');

    insert into combined_view values('AMA', 'ask me anything', 'eng', 'internet', 2, null, null);
    insert into combined_view values('AMa', 'abbreviation management', 'eng', 'web', 1, null, null);
    insert into combined_view values('Îma--ș!!', 'intalnirea martorilor americani -- serpii !!', 'ro', 'random', 3, null, null);
    
    insert into abbr_lists values(seq_list.nextval, 2, 'my list', 0, null, null);
    insert into abbr_list_contents values(1, 3, 0);
    insert into abbr_list_contents values(1, 2, 1);
    insert into abbr_list_contents values(1, 1, 2);
    commit;
end;

/