USE agri_prices;

-- Markets
INSERT INTO markets (name, location) VALUES 
('Kigali Main Market', 'Gasabo'),
('Muhanga Market', 'Muhanga'),
('Musanze Market', 'Musanze'),
('Huye Market', 'Huye');

-- Crops
INSERT INTO crops (name) VALUES 
('Maize'), 
('Beans'), 
('Cassava'),
('Potatoes');

-- Test Users
INSERT INTO users (name, phone, role, location) VALUES 
('Test Farmer', '+250788870662', 'farmer', 'Gasabo'),
('Agent John', '+250729362803', 'agent', 'Kigali'),
('Admin User', '+250782543693', 'admin', 'Kigali');