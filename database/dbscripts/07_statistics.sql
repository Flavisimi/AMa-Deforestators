create or replace package ama_statistics as
    function most_visited return SYS_REFCURSOR;
    function most_controversial return SYS_REFCURSOR;
    function highest_like_rate return SYS_REFCURSOR;
    function most_active_users(v_cutoff_date date) return SYS_REFCURSOR;
end;

/

create or replace package body ama_statistics as
    function most_visited return SYS_REFCURSOR is
        v_cursor SYS_REFCURSOR;
    begin
        open v_cursor for
        select a.id, a.searchable_name, a.meaning_count, a.created_at, a.updated_at, i.visits 
        from abbreviations a join 
        (select abbr_id as id, count(*) as visits from visit_logs group by abbr_id order by count(*) desc) i 
        on a.id = i.id;

        return v_cursor;
    end;

    function most_controversial return SYS_REFCURSOR is
        v_cursor SYS_REFCURSOR;
    begin
        open v_cursor for
        select m.id, m.abbr_id, m.name, m.short_expansion, m.description, m.uploader_id, m.approval_status, m.lang, m.domain, m.created_at, m.updated_at
        from meanings m join 
        (select meaning_id as id from votes group by meaning_id order by count(*) desc, abs(sum(vote)) asc) v 
        on m.id = v.id;

        return v_cursor;
    end;
    
    function highest_like_rate return SYS_REFCURSOR is
        v_cursor SYS_REFCURSOR;
    begin
        open v_cursor for
        select m.id, m.abbr_id, m.name, m.short_expansion, m.description, m.uploader_id, m.approval_status, m.lang, m.domain, m.created_at, m.updated_at,
            (select count(*) from votes where meaning_id = m.id and vote = 1)/(select count(*) from visit_logs where abbr_id = m.abbr_id and visitor_id is not null) as rate
        from meanings m 
        where (select count(*) from visit_logs where abbr_id = m.abbr_id and visitor_id is not null) > 0 
        order by rate desc;
        
        return v_cursor;
    end;

    function most_active_users(v_cutoff_date date) return SYS_REFCURSOR is
        v_cursor SYS_REFCURSOR;
    begin
        open v_cursor for
        select u.id, u.name, u.role, u.email, u.created_at, u.updated_at, 
            0.1*(select count(*) from visit_logs where visitor_id = u.id and visit_date >= v_cutoff_date)
            + 1*(select count(*) from votes where voter_id = u.id and vote_date >= v_cutoff_date)
            + 10*(select count(*) from meanings where uploader_id = u.id and updated_at >= v_cutoff_date)
            + 3*(select count(*) from abbr_lists where creator_id = u.id and updated_at >= v_cutoff_date) as activity 
        from users u 
        order by activity desc;

        return v_cursor;
    end;
end;

/
