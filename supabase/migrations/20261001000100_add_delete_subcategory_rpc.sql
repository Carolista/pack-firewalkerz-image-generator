begin;

-- Unassign and delete in one transaction; security invoker keeps RLS in force.
create function public.delete_game_element_subcategory(p_subcategory_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
	unassigned_count integer;
	deleted_count integer;
begin
	update public.game_elements
	set subcategory_id = null
	where subcategory_id = p_subcategory_id;
	get diagnostics unassigned_count = row_count;

	delete from public.game_element_subcategories
	where id = p_subcategory_id;
	get diagnostics deleted_count = row_count;

	if deleted_count = 0 then
		raise exception 'Subcategory not found or not deletable'
			using errcode = 'P0002';
	end if;

	return unassigned_count;
end
$function$;

revoke all on function public.delete_game_element_subcategory(uuid)
	from public, anon;
grant execute on function public.delete_game_element_subcategory(uuid)
	to authenticated;

commit;
