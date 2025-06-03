declare
    v_id integer;
begin
    insert into users values(seq_user.nextval, 'admin', auth_package.hash_password('admin_test'), 'ADMIN', sysdate, sysdate, null, 'admin@ama.io');
    for v_index in 1..100 loop
        insert into users values(seq_user.nextval, 'user' || v_index, auth_package.hash_password('user' || v_index || '_test'), 'USER', sysdate, sysdate, null, 'user' || v_index || '@ama.io');
    end loop;

    insert into combined_view values('AMA', 'ask me anything', 'used on internet forums when a person wants to receive questions from netizens', 'eng', 'internet', 2, null, null);
    insert into combined_view values('AMa', 'abbreviation management', 'an application which manages abbreviations and their meanings', 'eng', 'web', 1, null, null);
    insert into combined_view values('Îma--ș!!', 'intalnirea martorilor americani -- serpii !!', 'nonsens', 'ro', 'random', 3, null, null);
    insert into combined_view values('NP', 'no problem', 'a common saying', 'eng', 'speech', 1, null, null);
    insert into combined_view values('NP', 'nondeterministic polynomial', 'a class of decisional problems', 'eng', 'computer science', 1, null, null);
    insert into combined_view values('TY', 'thank you', 'expression of gratitude', 'eng', 'speech', 23, null, null);
    insert into combined_view values('ms', 'mersi', 'expression of gratitude', 'ro', 'speech', 81, null, null);
    insert into combined_view values('MS', 'microsoft', 'large tech company', 'eng', 'tech', 7, null, null);
    insert into combined_view values('Ms', 'miss', 'a form of referring to a woman', 'eng', 'speech', 22, null, null);
    insert into combined_view values('LOL', 'laughing out loud', 'expression of amusement', 'eng', 'speech', 99, null, null);
    insert into combined_view values('LoL', 'League of Legends', 'video game', 'eng', 'gaming', 1, null, null);

    insert into abbr_lists values(seq_list.nextval, 2, 'my list', 0, null, null);
    insert into abbr_list_contents values(1, 3, null);
    insert into abbr_list_contents values(1, 2, null);
    insert into abbr_list_contents values(1, 1, null);
    insert into abbr_list_contents values(1, 6, null);

    insert into abbr_lists values(seq_list.nextval, 1, 'my private list', 1, null, null);
    insert into abbr_list_contents values(2, 11, null);
    insert into abbr_list_contents values(2, 10, null);
    insert into abbr_list_contents values(2, 7, null);

    insert into visit_logs values(null, 2, sysdate - 1);
    insert into visit_logs values(null, 2, sysdate - 2);
    insert into visit_logs values(null, 2, sysdate - 3);
    insert into visit_logs values(1, 2, sysdate - 1);
    insert into visit_logs values(2, 2, sysdate - 1);

    insert into visit_logs values(null, 1, sysdate - 1);
    insert into visit_logs values(null, 1, sysdate - 1);

    insert into visit_logs values(3, 3, sysdate - 1);
    insert into visit_logs values(3, 3, sysdate - 2);
    insert into visit_logs values(3, 3, sysdate - 3);
    insert into visit_logs values(3, 3, sysdate - 4);
    insert into visit_logs values(3, 3, sysdate - 5);
    insert into visit_logs values(3, 3, sysdate - 6);


    for v_index in 1..100 loop
        insert into votes values(v_index, 5, -1 + 2 * MOD(v_index, 2), sysdate);
        insert into visit_logs values(v_index, 3, sysdate);
    end loop;

    insert into votes values(1, 1, 1, sysdate);
    insert into visit_logs values(1, 1, sysdate);
    insert into votes values(2, 1, 1, sysdate);
    insert into visit_logs values(2, 1, sysdate);
    insert into votes values(3, 1, 1, sysdate);
    insert into visit_logs values(3, 1, sysdate);

    insert into votes values(6, 2, -1, sysdate);
    insert into visit_logs values(6, 1, sysdate);
    insert into votes values(9, 2, -1, sysdate);
    insert into visit_logs values(9, 1, sysdate);
    insert into votes values(8, 2, -1, sysdate);
    insert into visit_logs values(8, 1, sysdate);
    insert into votes values(7, 2, -1, sysdate);
    insert into visit_logs values(7, 1, sysdate);

    for v_index in 1..99 loop
        insert into votes values(v_index, 11, 1, sysdate);
        insert into visit_logs values(v_index, 6, sysdate);
    end loop;

    for v_index in 1..99 loop
        insert into visit_logs values(null, 6, sysdate - dbms_random.value(1, 30));
    end loop;

    commit;
end;

/