-- Create transaction_items table
create table if not exists transaction_items (
  id uuid default uuid_generate_v4() primary key,
  transaction_id bigint references transactions(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete cascade,
  quantity integer not null default 1,
  price_at_time integer not null, -- Store price at time of transaction
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create menu_item_analytics view
create or replace view menu_item_analytics as
select 
  mi.id,
  mi.name,
  mi.price,
  count(ti.id) as total_orders,
  sum(ti.quantity) as total_quantity_sold,
  sum(ti.quantity * ti.price_at_time) as total_revenue
from menu_items mi
left join transaction_items ti on mi.id = ti.menu_item_id
group by mi.id, mi.name, mi.price;

-- Create daily_revenue view
create or replace view daily_revenue as
select 
  date_trunc('day', t.created_at) as date,
  sum(t.amount) as total_revenue,
  count(t.id) as total_transactions
from transactions t
group by date_trunc('day', t.created_at)
order by date desc;

-- Create customer_analytics view
create or replace view customer_analytics as
select 
  customer_name,
  count(id) as total_orders,
  sum(amount) as total_spent,
  min(created_at) as first_order,
  max(created_at) as last_order
from transactions
group by customer_name;

-- Add RLS policies for transaction_items
alter table transaction_items enable row level security;

drop policy if exists "Users can view their own transaction items" on transaction_items;
create policy "Users can view their own transaction items"
  on transaction_items for select
  using (
    exists (
      select 1 from transactions t
      where t.id = transaction_items.transaction_id
      and t.location_id in (
        select id from locations
        where owner_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can insert their own transaction items" on transaction_items;
create policy "Users can insert their own transaction items"
  on transaction_items for insert
  with check (
    exists (
      select 1 from transactions t
      where t.id = transaction_items.transaction_id
      and t.location_id in (
        select id from locations
        where owner_id = auth.uid()
      )
    )
  );

-- Create function to update transaction items when a transaction is created
create or replace function handle_new_transaction()
returns trigger as $$
begin
  -- Insert transaction items based on the transaction's items
  insert into transaction_items (transaction_id, menu_item_id, quantity, price_at_time)
  select 
    NEW.id,
    (jsonb_array_elements(NEW.items)->>'id')::uuid,
    (jsonb_array_elements(NEW.items)->>'quantity')::integer,
    (jsonb_array_elements(NEW.items)->>'price')::integer
  from transactions
  where id = NEW.id;
  
  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger for new transactions
drop trigger if exists on_transaction_created on transactions;
create trigger on_transaction_created
  after insert on transactions
  for each row
  execute function handle_new_transaction(); 