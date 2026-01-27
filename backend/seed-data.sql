-- Sample PC Parts for Testing

-- CPUs
INSERT INTO PCParts (Name, Category, Manufacturer, Price, PowerConsumption, Specifications, CreatedAt, UpdatedAt) VALUES
('Intel Core i9-13900K', 'CPU', 'Intel', 589.99, 125, '{"socket": "LGA1700", "cores": 24, "threads": 32}', NOW(), NOW()),
('AMD Ryzen 9 7950X', 'CPU', 'AMD', 699.99, 170, '{"socket": "AM5", "cores": 16, "threads": 32}', NOW(), NOW()),
('Intel Core i7-13700K', 'CPU', 'Intel', 419.99, 125, '{"socket": "LGA1700", "cores": 16, "threads": 24}', NOW(), NOW()),
('AMD Ryzen 7 7700X', 'CPU', 'AMD', 349.99, 105, '{"socket": "AM5", "cores": 8, "threads": 16}', NOW(), NOW());

-- Motherboards
INSERT INTO PCParts (Name, Category, Manufacturer, Price, PowerConsumption, Specifications, CreatedAt, UpdatedAt) VALUES
('ASUS ROG STRIX Z790-E', 'Motherboard', 'ASUS', 449.99, 80, '{"socket": "LGA1700", "chipset": "Z790", "ram_slots": 4}', NOW(), NOW()),
('MSI MAG X670E TOMAHAWK', 'Motherboard', 'MSI', 399.99, 80, '{"socket": "AM5", "chipset": "X670E", "ram_slots": 4}', NOW(), NOW()),
('Gigabyte Z790 AORUS MASTER', 'Motherboard', 'Gigabyte', 529.99, 85, '{"socket": "LGA1700", "chipset": "Z790", "ram_slots": 4}', NOW(), NOW());

-- RAM
INSERT INTO PCParts (Name, Category, Manufacturer, Price, PowerConsumption, Specifications, CreatedAt, UpdatedAt) VALUES
('Corsair Vengeance DDR5 32GB', 'RAM', 'Corsair', 129.99, 10, '{"type": "DDR5", "speed": "6000MHz", "capacity": "32GB"}', NOW(), NOW()),
('G.Skill Trident Z5 64GB', 'RAM', 'G.Skill', 249.99, 12, '{"type": "DDR5", "speed": "6400MHz", "capacity": "64GB"}', NOW(), NOW()),
('Kingston Fury Beast 32GB', 'RAM', 'Kingston', 109.99, 10, '{"type": "DDR5", "speed": "5600MHz", "capacity": "32GB"}', NOW(), NOW());

-- GPUs
INSERT INTO PCParts (Name, Category, Manufacturer, Price, PowerConsumption, Specifications, CreatedAt, UpdatedAt) VALUES
('NVIDIA RTX 4090', 'GPU', 'NVIDIA', 1599.99, 450, '{"memory": "24GB", "interface": "PCIe 4.0"}', NOW(), NOW()),
('AMD RX 7900 XTX', 'GPU', 'AMD', 999.99, 355, '{"memory": "24GB", "interface": "PCIe 4.0"}', NOW(), NOW()),
('NVIDIA RTX 4080', 'GPU', 'NVIDIA', 1199.99, 320, '{"memory": "16GB", "interface": "PCIe 4.0"}', NOW(), NOW()),
('AMD RX 7900 XT', 'GPU', 'AMD', 799.99, 300, '{"memory": "20GB", "interface": "PCIe 4.0"}', NOW(), NOW());

-- Storage
INSERT INTO PCParts (Name, Category, Manufacturer, Price, PowerConsumption, Specifications, CreatedAt, UpdatedAt) VALUES
('Samsung 990 Pro 2TB', 'Storage', 'Samsung', 199.99, 7, '{"type": "NVMe SSD", "capacity": "2TB", "interface": "PCIe 4.0"}', NOW(), NOW()),
('WD Black SN850X 1TB', 'Storage', 'Western Digital', 129.99, 7, '{"type": "NVMe SSD", "capacity": "1TB", "interface": "PCIe 4.0"}', NOW(), NOW()),
('Crucial P5 Plus 2TB', 'Storage', 'Crucial', 169.99, 7, '{"type": "NVMe SSD", "capacity": "2TB", "interface": "PCIe 4.0"}', NOW(), NOW());

-- PSUs
INSERT INTO PCParts (Name, Category, Manufacturer, Price, PowerConsumption, Specifications, CreatedAt, UpdatedAt) VALUES
('Corsair RM1000x', 'PSU', 'Corsair', 199.99, 0, '{"wattage": 1000, "efficiency": "80+ Gold", "modular": "fully"}', NOW(), NOW()),
('EVGA SuperNOVA 850 G6', 'PSU', 'EVGA', 149.99, 0, '{"wattage": 850, "efficiency": "80+ Gold", "modular": "fully"}', NOW(), NOW()),
('Seasonic PRIME TX-1000', 'PSU', 'Seasonic', 299.99, 0, '{"wattage": 1000, "efficiency": "80+ Titanium", "modular": "fully"}', NOW(), NOW());

-- Cases
INSERT INTO PCParts (Name, Category, Manufacturer, Price, PowerConsumption, Specifications, CreatedAt, UpdatedAt) VALUES
('Lian Li O11 Dynamic EVO', 'Case', 'Lian Li', 159.99, 0, '{"form_factor": "Mid Tower", "color": "Black"}', NOW(), NOW()),
('NZXT H7 Flow', 'Case', 'NZXT', 129.99, 0, '{"form_factor": "Mid Tower", "color": "White"}', NOW(), NOW()),
('Fractal Design Torrent', 'Case', 'Fractal Design', 199.99, 0, '{"form_factor": "Mid Tower", "color": "Black"}', NOW(), NOW());
