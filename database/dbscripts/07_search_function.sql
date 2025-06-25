create or replace function levenshtein_distance( p_searched_abv in varchar2, p_abv in varchar2, p_ignore_stop in number) return number deterministic is
    type t_number_array is table of char index by pls_integer;
    type t_array is table of t_number_array index by pls_integer;
    v_mat t_array;
    v_searched_abv_chars t_number_array;
    v_abv_chars t_number_array;
    v_len1 pls_integer := length(p_searched_abv);
    v_len2 pls_integer := length(p_abv);
    v_cost pls_integer;
    v_min_distance pls_integer;
    i pls_integer;
    j pls_integer;
    v_stop constant pls_integer := 3;
begin
    if p_searched_abv = p_abv then
        return 0;
    end if;
    if v_len1 = 0 then
        return least(v_len2, v_stop);
    end if;
    if v_len2 = 0 then
        return least(v_len1, v_stop);
    end if;

    for i in 1..v_len1 loop
        v_searched_abv_chars(i) := substr(p_searched_abv, i, 1);
    end loop;
    for j in 1..v_len2 loop
        v_abv_chars(j) := substr(p_abv, j, 1);
    end loop;

    v_mat(0)(0) := 0;
    for i in 1..v_len1 loop
        v_mat(i)(0) := i;
    end loop;
    
    for j in 1..v_len2 loop
        v_mat(0)(j) := j;
    end loop;

    for i in 1..v_len1 loop
        v_min_distance := v_mat(i)(0);
        for j in 1..v_len2 loop
            if v_searched_abv_chars(i) = v_abv_chars(j) then
                v_cost := 0;
            else
                v_cost := 1;
            end if;
            v_mat(i)(j) := least(
                v_mat(i-1)(j) + 1,           -- Insertion
                v_mat(i)(j-1) + 1,           -- Deletion
                v_mat(i-1)(j-1) + v_cost     -- Substitution
            );
            v_min_distance := least(v_min_distance, v_mat(i)(j));
        end loop;
        if v_min_distance >= v_stop and p_ignore_stop = 0 then
            return v_stop; 
        end if;
    end loop;

    return least(v_mat(v_len1)(v_len2), v_stop);
end levenshtein_distance;
/
create or replace function parse_words(p_text in varchar2) return varchar2 is
    v_text varchar2(256) := trim(p_text) || ' ';
    v_result varchar2(4000);
    v_start pls_integer := 1;
    v_end pls_integer;
    v_word varchar2(256);
begin
    if v_text is null or v_text = ' ' then
        return null;
    end if;

    loop
        v_end := instr(v_text, ' ', v_start);
        exit when v_end = 0;

        v_word := trim(substr(v_text, v_start, v_end - v_start));
        if v_word is not null then
            v_result := v_result || '%' || v_word || '%|';
        end if;

        v_start := v_end + 1;
    end loop;
    return rtrim(v_result, '|');
end parse_words;
/
create or replace function search_abv(p_search_term in varchar2,p_search_type in varchar2) return sys_refcursor is
    v_cursor sys_refcursor;
    v_search_term varchar2(256) := upper(trim(p_search_term));
begin
    if p_search_term is null or v_search_term = '' then
        raise_application_error(-20005, 'Search term cannot be empty');
    end if;

    if p_search_type not in ('name', 'meaning') then
        raise_application_error(-20006, 'Invalid search type');
    end if;

    if p_search_type = 'name' then
        open v_cursor for
            select 
                id,
                searchable_name,
                meaning_count,
                created_at,
                updated_at,
                distance
            from (
                select 
                    a.id,
                    a.searchable_name,
                    a.meaning_count,
                    a.created_at,
                    a.updated_at,
                    levenshtein_distance(v_search_term, upper(a.searchable_name), 0) as distance
                from abbreviations a
            )
            where distance < 3
            order by distance, searchable_name;
    else 
        open v_cursor for
            select distinct
                a.id,
                a.searchable_name,
                a.meaning_count,
                a.created_at,
                a.updated_at,
                0 as distance 
            from abbreviations a
            join meanings m on a.id = m.abbr_id
            where parse_words(upper(m.short_expansion)) like parse_words(v_search_term)
            order by a.searchable_name;
    end if;

    return v_cursor;
exception
    when others then
        raise_application_error(-20007, 'Error in search_abv');
end search_abv;
/
create or replace function search_abv_enhanced(
    p_search_term in varchar2,
    p_search_type in varchar2,
    p_language in varchar2 default null,
    p_domain in varchar2 default null
) return sys_refcursor is
    v_cursor sys_refcursor;
    v_search_term varchar2(256) := upper(trim(p_search_term));
    v_language varchar2(30) := trim(p_language);
    v_domain varchar2(30) := trim(p_domain);
begin
    if p_search_term is null or v_search_term = '' then
        raise_application_error(-20005, 'Search term cannot be empty');
    end if;

    if p_search_type not in ('name', 'meaning') then
        raise_application_error(-20006, 'Invalid search type');
    end if;

    if v_language = '' then
        v_language := null;
    end if;
    
    if v_domain = '' then
        v_domain := null;
    end if;

    if p_search_type = 'name' then
        if v_language is null and v_domain is null then
            open v_cursor for
                select 
                    id,
                    searchable_name,
                    meaning_count,
                    created_at,
                    updated_at,
                    distance
                from (
                    select 
                        a.id,
                        a.searchable_name,
                        a.meaning_count,
                        a.created_at,
                        a.updated_at,
                        levenshtein_distance(v_search_term, upper(a.searchable_name), 0) as distance
                    from abbreviations a
                )
                where distance < 3
                order by distance, searchable_name;
        else
            open v_cursor for
                select distinct
                    a.id,
                    a.searchable_name,
                    a.meaning_count,
                    a.created_at,
                    a.updated_at,
                    levenshtein_distance(v_search_term, upper(a.searchable_name), 0) as distance
                from abbreviations a
                join meanings m on a.id = m.abbr_id
                where levenshtein_distance(v_search_term, upper(a.searchable_name), 0) < 3
                and (v_language is null or upper(m.lang) = upper(v_language))
                and (v_domain is null or upper(m.domain) = upper(v_domain))
                order by distance, searchable_name;
        end if;
    else 
        open v_cursor for
            select distinct
                a.id,
                a.searchable_name,
                a.meaning_count,
                a.created_at,
                a.updated_at,
                0 as distance 
            from abbreviations a
            join meanings m on a.id = m.abbr_id
            where parse_words(upper(m.short_expansion)) like parse_words(v_search_term)
            and (v_language is null or upper(m.lang) = upper(v_language))
            and (v_domain is null or upper(m.domain) = upper(v_domain))
            order by a.searchable_name;
    end if;

    return v_cursor;
exception
    when others then
        raise_application_error(-20007, 'Error in search_abv_enhanced');
end search_abv_enhanced;
/

create or replace function get_available_languages return sys_refcursor is
    v_cursor sys_refcursor;
begin
    open v_cursor for
        select lang as language_code
        from languages
        order by lang;
    return v_cursor;
end get_available_languages;
/

create or replace function get_available_domains return sys_refcursor is
    v_cursor sys_refcursor;
begin
    open v_cursor for
        select domain
        from domains
        order by domain;
    return v_cursor;
end get_available_domains;
/
create or replace function search_abv_with_filters(
    p_search_term in varchar2,
    p_search_type in varchar2,
    p_language in varchar2 default null,
    p_domain in varchar2 default null
) return sys_refcursor is
    v_cursor sys_refcursor;
    v_search_term varchar2(256) := upper(trim(p_search_term));
    v_language varchar2(30) := trim(p_language);
    v_domain varchar2(30) := trim(p_domain);
    v_has_search boolean := false;
    v_has_filters boolean := false;
begin
    if p_search_type not in ('name', 'meaning') then
        raise_application_error(-20006, 'Invalid search type');
    end if;

    if v_language = '' then
        v_language := null;
    end if;
    
    if v_domain = '' then
        v_domain := null;
    end if;

    v_has_search := v_search_term is not null and v_search_term != '';
    v_has_filters := v_language is not null or v_domain is not null;

    if not v_has_search and not v_has_filters then
        raise_application_error(-20008, 'Either search term or filters must be provided');
    end if;

    if v_has_search and p_search_type = 'name' then
        if v_has_filters then
            open v_cursor for
                select distinct
                    a.id,
                    a.searchable_name,
                    a.meaning_count,
                    a.created_at,
                    a.updated_at,
                    levenshtein_distance(v_search_term, upper(a.searchable_name), 0) as distance
                from abbreviations a
                join meanings m on a.id = m.abbr_id
                where levenshtein_distance(v_search_term, upper(a.searchable_name), 0) < 3
                and (v_language is null or upper(m.lang) = upper(v_language))
                and (v_domain is null or upper(m.domain) = upper(v_domain))
                order by distance, a.searchable_name;
        else
            open v_cursor for
                select 
                    id,
                    searchable_name,
                    meaning_count,
                    created_at,
                    updated_at,
                    distance
                from (
                    select 
                        a.id,
                        a.searchable_name,
                        a.meaning_count,
                        a.created_at,
                        a.updated_at,
                        levenshtein_distance(v_search_term, upper(a.searchable_name), 0) as distance
                    from abbreviations a
                )
                where distance < 3
                order by distance, searchable_name;
        end if;
    elsif v_has_search and p_search_type = 'meaning' then
        open v_cursor for
            select distinct
                a.id,
                a.searchable_name,
                a.meaning_count,
                a.created_at,
                a.updated_at,
                0 as distance 
            from abbreviations a
            join meanings m on a.id = m.abbr_id
            where parse_words(upper(m.short_expansion)) like parse_words(v_search_term)
            and (v_language is null or upper(m.lang) = upper(v_language))
            and (v_domain is null or upper(m.domain) = upper(v_domain))
            order by a.searchable_name;
    else
        open v_cursor for
            select distinct
                a.id,
                a.searchable_name,
                a.meaning_count,
                a.created_at,
                a.updated_at,
                0 as distance 
            from abbreviations a
            join meanings m on a.id = m.abbr_id
            where (v_language is null or upper(m.lang) = upper(v_language))
            and (v_domain is null or upper(m.domain) = upper(v_domain))
            order by a.searchable_name;
    end if;

    return v_cursor;
exception
    when others then
        raise_application_error(-20007, 'Error in search_abv_with_filters: ' || sqlerrm);
end search_abv_with_filters;
/