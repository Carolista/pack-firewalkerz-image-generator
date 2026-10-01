begin;

do $migration$
declare
	element_type_format text;
begin
	select format_type(attribute.atttypid, attribute.atttypmod)
	into element_type_format
	from pg_attribute as attribute
	where attribute.attrelid = 'public.game_elements'::regclass
		and attribute.attname = 'element_type'
		and not attribute.attisdropped;

	if element_type_format is null then
		raise exception 'Expected public.game_elements.element_type to exist';
	end if;
	if element_type_format <> 'text'
		and element_type_format not like 'character varying%' then
		raise exception 'Expected game_elements.element_type to be text or varchar, got %', element_type_format;
	end if;
end
$migration$;

create table public.game_element_subcategories (
	id uuid primary key default gen_random_uuid(),
	element_type text not null,
	name text not null,
	constraint game_element_subcategories_type_check
		check (element_type in ('character', 'npc', 'enemy', 'location', 'item')),
	constraint game_element_subcategories_name_check
		check (char_length(btrim(name)) between 1 and 80),
	constraint game_element_subcategories_id_type_unique
		unique (id, element_type)
);

create unique index game_element_subcategories_unique_name
	on public.game_element_subcategories (element_type, lower(btrim(name)));

alter table public.game_elements
	add column subcategory_id uuid;

alter table public.game_elements
	add constraint game_elements_subcategory_type_fkey
	foreign key (subcategory_id, element_type)
	references public.game_element_subcategories (id, element_type)
	on delete restrict;

alter table public.game_element_subcategories enable row level security;
grant select on public.game_element_subcategories to anon, authenticated;

create policy game_element_subcategories_public_read
	on public.game_element_subcategories
	for select
	to anon, authenticated
	using (true);

grant insert, update, delete on public.game_element_subcategories
	to authenticated;

create policy game_element_subcategories_admin_insert
	on public.game_element_subcategories
	for insert
	to authenticated
	with check (
		auth.uid() = any (
			array[
				'c9254080-1f92-4877-89da-2cc7e5f91a38'::uuid,
				'070246e8-c92c-4404-a6bd-a3e19a8d3db4'::uuid
			]
		)
	);

create policy game_element_subcategories_admin_update
	on public.game_element_subcategories
	for update
	to authenticated
	using (
		auth.uid() = any (
			array[
				'c9254080-1f92-4877-89da-2cc7e5f91a38'::uuid,
				'070246e8-c92c-4404-a6bd-a3e19a8d3db4'::uuid
			]
		)
	)
	with check (
		auth.uid() = any (
			array[
				'c9254080-1f92-4877-89da-2cc7e5f91a38'::uuid,
				'070246e8-c92c-4404-a6bd-a3e19a8d3db4'::uuid
			]
		)
	);

create policy game_element_subcategories_admin_delete
	on public.game_element_subcategories
	for delete
	to authenticated
	using (
		auth.uid() = any (
			array[
				'c9254080-1f92-4877-89da-2cc7e5f91a38'::uuid,
				'070246e8-c92c-4404-a6bd-a3e19a8d3db4'::uuid
			]
		)
	);

commit;
