-- Generado por supabase/gen-seed.mjs. Carga inicial; vuelve a ejecutarlo sin duplicar.

update public.settings set duration_minutes=90, max_party_size=10, slots=array['13:00','13:30','14:00','14:30','15:00','15:30','19:30','20:00','20:30','21:00','21:30','22:00','22:30']::text[] where id;

delete from public.services;

insert into public.services (name,from_time,to_time,last_booking,sort) values
('Comida','13:00','16:00','15:30',0),
('Cena','19:30','22:30','22:30',1);

insert into public.zones (id,name,capacity,enabled,sort) values
('salon-interior','Salón interior',30,true,0),
('salon-exterior','Salón exterior',70,true,1),
('terraza','Terraza',50,true,2)
on conflict (id) do update set name=excluded.name, capacity=excluded.capacity, enabled=excluded.enabled, sort=excluded.sort;

insert into public.opening_hours (day,closed,open1,close1,open2,close2) values
(0,false,null,null,null,null),
(1,false,null,null,null,null),
(2,false,null,null,null,null),
(3,false,null,null,null,null),
(4,false,null,null,null,null),
(5,false,null,null,null,null),
(6,false,null,null,null,null)
on conflict (day) do update set closed=excluded.closed, open1=excluded.open1, close1=excluded.close1, open2=excluded.open2, close2=excluded.close2;

delete from public.menu_items;
delete from public.menu_categories;

insert into public.menu_categories (id,name,sort) values
('tapas','Tapas',0),
('croquetas','Croquetas',1),
('para-picar','Para picar',2),
('pescados','Pescados',3),
('carnes','Carnes',4),
('ensaladas','Ensaladas',5);

insert into public.menu_items (category_id,name,price,description,sort) values
('tapas','Ensaladilla','4,00€ / 5,00€','',0),
('tapas','Patatas con ajo','3,60€ / 4,70€','',1),
('tapas','Marinera / matrimonio','1,80€','',2),
('tapas','Michirones','4,00€ / 5,00€','',3),
('tapas','Bacalao','4,00€ / 5,00€','',4),
('tapas','Boquerones en vinagre','4,00€ / 6,00€','',5),
('tapas','Pulpo a la Paquera','7,50€ / 10,50€','',6),
('tapas','Magra con tomate','4,50€ / 5,50€','',7),
('tapas','Callos','4,60€ / 7,70€','',8),
('tapas','Tortilla de patatas','5,50€','',9),
('croquetas','Jamón ibérico','1,20€','',0),
('croquetas','Merluza','1,20€','',1),
('croquetas','Boletus','1,20€','',2),
('croquetas','Pollo','0,90€','',3),
('croquetas','Pulpo','1,20€','',4),
('croquetas','Rabo de toro','1,20€','',5),
('croquetas','Salmón','1,20€','',6),
('croquetas','Verduras con queso','1,20€','',7),
('para-picar','Bacon cheese','4,80€','',0),
('para-picar','Chicken cheese','5,50€','',1),
('para-picar','Kebab frites','5,50€','',2),
('para-picar','Tacos Pacos de calamares','6,50€','',3),
('para-picar','Tabla de quesos y patés','8,50€','',4),
('para-picar','Tabla de jamón y queso','8,00€','',5),
('para-picar','Patatas clásicas','2,00€','',6),
('para-picar','Patatas deluxe','3,00€ / 4,50€','',7),
('para-picar','Nachos','7,00€','',8),
('para-picar','Alitas de pollo','4,80€','',9),
('pescados','Dorada a la espalda','10,50€','',0),
('pescados','Pata de pulpo portmanera','14,20€','',1),
('pescados','Fuente de calamares','8,50€ / 14,50€','',2),
('pescados','Calamares a la Paquera','6,20€ / 8,80€','',3),
('pescados','Gambas al ajillo','4,30€','',4),
('pescados','Pulpo','6,50€ / 9,20€','',5),
('pescados','Bacalao a la murciana','9,50€','',6),
('pescados','Emperador con salsa verde','9,50€','',7),
('pescados','Lubina a la plancha','9,50€','',8),
('pescados','Almejas a la marinera','5,00€','',9),
('carnes','Brocheta de entrecot','9,50€','',0),
('carnes','Brocheta de solomillo','8,00€','',1),
('carnes','Brocheta de pollo','6,00€','',2),
('carnes','Gyozas de pato','6,80€','',3),
('carnes','Plumita ibérica','9,50€','',4),
('carnes','Chuletas de cordero','12,00€','',5),
('carnes','Lomo a la plancha','6,00€','',6),
('carnes','Pechuga a la plancha','6,00€','',7),
('carnes','Rabo de toro','9,50€','',8),
('carnes','Carrillada','9,80€','',9),
('ensaladas','3Pacos','8,70€','Lechuga, tomate, cebolla, espárragos, atún, huevo, queso parmesano y frutos secos',0),
('ensaladas','César','7,80€','Lechuga, pollo rebozado, maíz, queso, picatostes y salsa César',1),
('ensaladas','Rosa','7,80€','Lechuga, pollo rebozado, maíz, queso, picatostes y salsa rosa',2),
('ensaladas','Gourmet','9,00€','Lechuga gourmet, tomate cherry, gambitas y rulo de cabra a la plancha con frutos secos',3),
('ensaladas','Ahumados','7,50€','Salmón, bacalao, tomate y alcaparras',4),
('ensaladas','Marinera','9,00€','Tomate, pimientos, ventresca, anchoas, boquerones y olivas',5),
('ensaladas','Gazpachada','6,00€','Tomate y aceituna gazpachada',6);
