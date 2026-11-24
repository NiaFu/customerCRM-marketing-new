INSERT INTO tags(name,color) VALUES
('High Intent','#2563eb'),
('Follow-up','#e9a23b'),
('Post-sale','#149b74'),
('Service','#a855f7')
ON CONFLICT(name) DO NOTHING;
