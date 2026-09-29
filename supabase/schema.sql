-- ==============================================================================
-- FilamentPHP Admin Demo - Supabase PostgreSQL Database Schema
-- Eloquent-Equivalent Relations:
-- 1. Users: Base CRUD
-- 2. Categories: BelongsToMany Products (via category_product)
-- 3. Brands: MorphToMany Addresses (via addressables)
-- 4. Products: BelongsTo Category & Brand, MorphMany Comments
-- 5. Customers: HasManyThrough Payments (via Orders), MorphToMany Addresses (via addressables)
-- 6. Orders: BelongsTo Customer, MorphOne Address (via addressables), HasMany Payments
-- 7. Posts: BelongsTo User (author), MorphMany Comments
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'member')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    website VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Addresses Table (Polymorphic target for Brands, Customers, Orders)
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'United States',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polymorphic Pivot: Addressables
CREATE TABLE IF NOT EXISTS addressables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    addressable_id UUID NOT NULL,
    addressable_type VARCHAR(100) NOT NULL CHECK (addressable_type IN ('Brand', 'Customer', 'Order')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addressables_lookup ON addressables (addressable_id, addressable_type);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    old_price DECIMAL(12, 2),
    cost DECIMAL(12, 2) DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    security_stock INT NOT NULL DEFAULT 5,
    is_visible BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BelongsToMany Pivot: category_product
CREATE TABLE IF NOT EXISTS category_product (
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (category_id, product_id)
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Orders Table (BelongsTo Customer, MorphOne Address via addressables)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    currency VARCHAR(10) DEFAULT 'USD',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    shipping_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Payments Table (HasMany under Order; HasManyThrough from Customer via Orders)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    method VARCHAR(50) NOT NULL CHECK (method IN ('credit_card', 'bank_transfer', 'paypal', 'stripe')),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Posts Table (BelongsTo User as author)
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    banner_url TEXT,
    status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'scheduled')),
    published_at TIMESTAMP WITH TIME ZONE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Comments Table (MorphMany to Products and Posts)
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    commentable_id UUID NOT NULL,
    commentable_type VARCHAR(100) NOT NULL CHECK (commentable_type IN ('Product', 'Post')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_lookup ON comments (commentable_id, commentable_type);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE addressables ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow read/write policies for admin panel usage
CREATE POLICY "Public Read/Write All Users" ON users FOR ALL USING (true);
CREATE POLICY "Public Read/Write Categories" ON categories FOR ALL USING (true);
CREATE POLICY "Public Read/Write Brands" ON brands FOR ALL USING (true);
CREATE POLICY "Public Read/Write Addresses" ON addresses FOR ALL USING (true);
CREATE POLICY "Public Read/Write Addressables" ON addressables FOR ALL USING (true);
CREATE POLICY "Public Read/Write Products" ON products FOR ALL USING (true);
CREATE POLICY "Public Read/Write CategoryProduct" ON category_product FOR ALL USING (true);
CREATE POLICY "Public Read/Write Customers" ON customers FOR ALL USING (true);
CREATE POLICY "Public Read/Write Orders" ON orders FOR ALL USING (true);
CREATE POLICY "Public Read/Write Payments" ON payments FOR ALL USING (true);
CREATE POLICY "Public Read/Write Posts" ON posts FOR ALL USING (true);
CREATE POLICY "Public Read/Write Comments" ON comments FOR ALL USING (true);

-- ==============================================================================
-- INITIAL SEED DATA (FilamentPHP Demo Set)
-- ==============================================================================

-- Seed Users
INSERT INTO users (id, name, email, avatar_url, role, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Dan Harrin', 'admin@filamentphp.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'admin', 'active'),
('22222222-2222-2222-2222-222222222222', 'Ryan Chandler', 'ryan@filamentphp.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'editor', 'active'),
('33333333-3333-3333-3333-333333333333', 'Alex Vanderbist', 'alex@filamentphp.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'member', 'inactive')
ON CONFLICT (id) DO NOTHING;

-- Seed Categories
INSERT INTO categories (id, name, slug, description, is_visible, sort_order) VALUES
('c1111111-1111-1111-1111-111111111111', 'Smartphones & Tablets', 'smartphones-tablets', 'Latest mobile computing devices and accessories', true, 1),
('c2222222-2222-2222-2222-222222222222', 'Laptops & Workstations', 'laptops-workstations', 'High-performance ultrabooks and pro creator rigs', true, 2),
('c3333333-3333-3333-3333-333333333333', 'Audio & Headphones', 'audio-headphones', 'Noise cancelling studio headphones and spatial audio', true, 3),
('c4444444-4444-4444-4444-444444444444', 'Smart Home & Wearables', 'smart-home-wearables', 'Fitness watches and connected IoT home equipment', true, 4)
ON CONFLICT (id) DO NOTHING;

-- Seed Brands
INSERT INTO brands (id, name, slug, website, description, logo_url, is_visible) VALUES
('b1111111-1111-1111-1111-111111111111', 'Apple', 'apple', 'https://apple.com', 'Think different and premium consumer technology', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=150', true),
('b2222222-2222-2222-2222-222222222222', 'Sony', 'sony', 'https://sony.com', 'Pioneering sensory audio and visual experiences', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=150', true),
('b3333333-3333-3333-3333-333333333333', 'Samsung', 'samsung', 'https://samsung.com', 'Display and mobile innovation leader worldwide', 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=150', true),
('b4444444-4444-4444-4444-444444444444', 'Dell', 'dell', 'https://dell.com', 'Enterprise and developer workstations', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=150', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Addresses
INSERT INTO addresses (id, street, city, state, postal_code, country) VALUES
('a1111111-1111-1111-1111-111111111111', '1 Infinite Loop', 'Cupertino', 'CA', '95014', 'United States'),
('a2222222-2222-2222-2222-222222222222', '742 Evergreen Terrace', 'Springfield', 'OR', '97477', 'United States'),
('a3333333-3333-3333-3333-333333333333', '221B Baker Street', 'London', 'Greater London', 'NW1 6XE', 'United Kingdom'),
('a4444444-4444-4444-4444-444444444444', '350 5th Avenue', 'New York', 'NY', '10118', 'United States')
ON CONFLICT (id) DO NOTHING;

-- Polymorphic Addressables: Brands and Customers
INSERT INTO addressables (address_id, addressable_id, addressable_type) VALUES
('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Brand'),
('a4444444-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444', 'Brand');

-- Seed Products
INSERT INTO products (id, name, slug, sku, barcode, description, price, old_price, cost, stock_quantity, security_stock, is_visible, status, category_id, brand_id, image_url) VALUES
('p1111111-1111-1111-1111-111111111111', 'iPhone 15 Pro Max', 'iphone-15-pro-max', 'APP-IPH15PM-256', '195949012345', 'Titanium design with A17 Pro chip and versatile 48MP main camera.', 1199.00, 1299.00, 750.00, 48, 10, true, 'published', 'c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400'),
('p2222222-2222-2222-2222-222222222222', 'MacBook Pro 16" M3 Max', 'macbook-pro-16-m3', 'APP-MBP16-M3X', '195949098765', 'The most advanced Mac laptop ever built for extreme workflows.', 3499.00, 3699.00, 2200.00, 15, 5, true, 'published', 'c2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'),
('p3333333-3333-3333-3333-333333333333', 'Sony WH-1000XM5', 'sony-wh-1000xm5', 'SNY-WH1000XM5', '027242923456', 'Industry-leading noise cancelation with two processors and 8 microphones.', 399.99, 449.99, 210.00, 76, 15, true, 'published', 'c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400'),
('p4444444-4444-4444-4444-444444444444', 'Samsung Galaxy S24 Ultra', 'samsung-s24-ultra', 'SAM-S24U-512', '880609512345', 'Galaxy AI is here. Epic titanium build with revolutionary zoom camera.', 1299.99, 1419.99, 820.00, 32, 8, true, 'published', 'c1111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400'),
('p5555555-5555-5555-5555-555555555555', 'Dell XPS 15 9530', 'dell-xps-15-9530', 'DEL-XPS15-4K', '884116412345', 'OLED 3.5K touch screen powered by 13th Gen Intel Core i9.', 2199.00, 2399.00, 1450.00, 9, 5, true, 'published', 'c2222222-2222-2222-2222-222222222222', 'b4444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400')
ON CONFLICT (id) DO NOTHING;

-- Seed Pivot category_product
INSERT INTO category_product (category_id, product_id) VALUES
('c1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111'),
('c2222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222222'),
('c3333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333333'),
('c1111111-1111-1111-1111-111111111111', 'p4444444-4444-4444-4444-444444444444'),
('c2222222-2222-2222-2222-222222222222', 'p5555555-5555-5555-5555-555555555555')
ON CONFLICT DO NOTHING;

-- Seed Customers
INSERT INTO customers (id, name, email, phone, gender, date_of_birth) VALUES
('u1111111-1111-1111-1111-111111111111', 'Sophia Montgomery', 'sophia.m@example.com', '+1 (555) 234-5678', 'female', '1992-05-14'),
('u2222222-2222-2222-2222-222222222222', 'Lucas Vance', 'lucas.vance@example.com', '+1 (555) 876-5432', 'male', '1988-11-23'),
('u3333333-3333-3333-3333-333333333333', 'Elena Rostova', 'elena.rostova@example.com', '+44 20 7946 0912', 'female', '1995-03-30'),
('u4444444-4444-4444-4444-444444444444', 'Marcus Chen', 'marcus.chen@example.com', '+1 (555) 432-8765', 'male', '1990-08-19')
ON CONFLICT (id) DO NOTHING;

-- Polymorphic Addressables: Customers
INSERT INTO addressables (address_id, addressable_id, addressable_type) VALUES
('a2222222-2222-2222-2222-222222222222', 'u1111111-1111-1111-1111-111111111111', 'Customer'),
('a3333333-3333-3333-3333-333333333333', 'u3333333-3333-3333-3333-333333333333', 'Customer');

-- Seed Orders
INSERT INTO orders (id, order_number, customer_id, status, currency, subtotal, shipping_price, total_price, notes) VALUES
('o1111111-1111-1111-1111-111111111111', 'ORD-2024-8901', 'u1111111-1111-1111-1111-111111111111', 'completed', 'USD', 1199.00, 25.00, 1224.00, 'Express courier delivery requested.'),
('o2222222-2222-2222-2222-222222222222', 'ORD-2024-8902', 'u2222222-2222-2222-2222-222222222222', 'processing', 'USD', 3499.00, 0.00, 3499.00, 'Free priority overnight shipping included.'),
('o3333333-3333-3333-3333-333333333333', 'ORD-2024-8903', 'u3333333-3333-3333-3333-333333333333', 'completed', 'USD', 399.99, 15.00, 414.99, 'International customs paid by customer.'),
('o4444444-4444-4444-4444-444444444444', 'ORD-2024-8904', 'u4444444-4444-4444-4444-444444444444', 'pending', 'USD', 1299.99, 20.00, 1319.99, 'Awaiting customer bank transfer confirmation.'),
('o5555555-5555-5555-5555-555555555555', 'ORD-2024-8905', 'u1111111-1111-1111-1111-111111111111', 'cancelled', 'USD', 2199.00, 25.00, 2224.00, 'Customer changed mind prior to dispatch.')
ON CONFLICT (id) DO NOTHING;

-- Polymorphic Addressables: Orders
INSERT INTO addressables (address_id, addressable_id, addressable_type) VALUES
('a2222222-2222-2222-2222-222222222222', 'o1111111-1111-1111-1111-111111111111', 'Order'),
('a3333333-3333-3333-3333-333333333333', 'o3333333-3333-3333-3333-333333333333', 'Order');

-- Seed Payments (HasMany under Order; HasManyThrough from Customer)
INSERT INTO payments (id, order_id, amount, currency, method, status, transaction_id) VALUES
('m1111111-1111-1111-1111-111111111111', 'o1111111-1111-1111-1111-111111111111', 1224.00, 'USD', 'stripe', 'completed', 'txn_str_9812938012'),
('m2222222-2222-2222-2222-222222222222', 'o2222222-2222-2222-2222-222222222222', 3499.00, 'USD', 'credit_card', 'completed', 'txn_cc_5519827361'),
('m3333333-3333-3333-3333-333333333333', 'o3333333-3333-3333-3333-333333333333', 414.99, 'USD', 'paypal', 'completed', 'txn_pp_1029384756'),
('m4444444-4444-4444-4444-444444444444', 'o4444444-4444-4444-4444-444444444444', 1319.99, 'USD', 'bank_transfer', 'pending', 'txn_bt_4492817203')
ON CONFLICT (id) DO NOTHING;

-- Seed Posts
INSERT INTO posts (id, title, slug, excerpt, content, banner_url, status, published_at, user_id) VALUES
('k1111111-1111-1111-1111-111111111111', 'Announcing Filament v3: What is New and Improved', 'announcing-filament-v3', 'Everything you need to know about the newest evolution of Filament PHP admin panel framework.', 'We are incredibly thrilled to announce Filament v3. This release brings complete color customization, full multi-tenancy support, nested resources, brand new form components, and enhanced performance across heavy data tables.', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', 'published', NOW() - INTERVAL '14 days', '11111111-1111-1111-1111-111111111111'),
('k2222222-2222-2222-2222-222222222222', 'Designing High-Conversion E-Commerce Dashboards', 'designing-high-conversion-dashboards', 'Key principles for structuring metrics, charts, and orders in modern administrative interfaces.', 'Dashboards should emphasize actionable signals over noise. By placing key revenue and fulfillment sparklines in top overview cards followed by chronological order streams, store managers can spot operational bottlenecks immediately.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800', 'published', NOW() - INTERVAL '5 days', '22222222-2222-2222-2222-222222222222'),
('k3333333-3333-3333-3333-333333333333', 'Upcoming Features in the Next Release', 'upcoming-features-next-release', 'A sneak peek into upcoming plugins, relation manager workflows, and AI integrations.', 'We are actively developing deeper polymorphic relation helpers, batch action webhooks, and inline row editing widgets. Stay tuned as we roll out beta builds next month.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 'draft', NULL, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Polymorphic Comments (for Products and Posts)
INSERT INTO comments (id, user_name, user_email, content, is_approved, commentable_id, commentable_type) VALUES
('x1111111-1111-1111-1111-111111111111', 'Sarah Jenkins', 'sarah.j@example.com', 'The titanium build feels so light compared to the 14 Pro. Excellent battery life!', true, 'p1111111-1111-1111-1111-111111111111', 'Product'),
('x2222222-2222-2222-2222-222222222222', 'David Becker', 'david.b@example.com', 'Noise cancelling on flights is pure magic. Highly recommend.', true, 'p3333333-3333-3333-3333-333333333333', 'Product'),
('x3333333-3333-3333-3333-333333333333', 'Taylor Otwell', 'taylor@laravel.com', 'Filament v3 is looking phenomenal. Great work team!', true, 'k1111111-1111-1111-1111-111111111111', 'Post'),
('x4444444-4444-4444-4444-444444444444', 'Caleb Porzio', 'caleb@livewire.com', 'The UI polish and snappy table interactions are top tier.', true, 'k1111111-1111-1111-1111-111111111111', 'Post')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- MULTI-ORGANIZATION, RBAC & PERFORMANCE ECOSYSTEM TABLES
-- ==============================================================================

-- 11. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    logo_url TEXT,
    period_active VARCHAR(100) DEFAULT '2025 - 2029',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    is_system BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Organization Memberships Table
CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    permission_overrides JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_lookup ON organization_memberships(user_id, organization_id);

-- 14. Structures Table
CREATE TABLE IF NOT EXISTS structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_name VARCHAR(255) NOT NULL,
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    leader_name VARCHAR(255) NOT NULL,
    leader_title VARCHAR(100) DEFAULT 'Ketua Umum',
    leader_avatar TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Sections Table
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    duties TEXT NOT NULL,
    leader_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Personnels Table
CREATE TABLE IF NOT EXISTS personnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    role_title VARCHAR(100) NOT NULL,
    nip VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Programs Table (Pusat Hubungan Data Operasional)
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    background TEXT NOT NULL,
    objectives TEXT NOT NULL,
    targets TEXT NOT NULL,
    indicator VARCHAR(255) NOT NULL,
    target_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    target_unit VARCHAR(50) DEFAULT 'Kegiatan',
    pic_personnel_id UUID REFERENCES personnels(id) ON DELETE SET NULL,
    pic_name VARCHAR(255) NOT NULL,
    timeline_start DATE NOT NULL,
    timeline_end DATE NOT NULL,
    budget_planned NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'revised', 'approved', 'active', 'completed', 'closed')),
    revision_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_org ON programs(organization_id);

-- 18. Agendas Table
CREATE TABLE IF NOT EXISTS agendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time_start VARCHAR(20),
    time_end VARCHAR(20),
    location VARCHAR(255) NOT NULL,
    participants_target VARCHAR(255) NOT NULL,
    actual_participants INT,
    pic_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'approved', 'upcoming', 'in_progress', 'completed', 'evaluated')),
    notes TEXT,
    documentation_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendas_org_prog ON agendas(organization_id, program_id);

-- 19. Performances Table
CREATE TABLE IF NOT EXISTS performances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    target_value NUMERIC(14, 2) NOT NULL,
    realized_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    percentage NUMERIC(6, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'delayed', 'needs_attention', 'achieved', 'evaluated')),
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    validated_by VARCHAR(255),
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Budgets & Transactions Table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    planned_amount NUMERIC(14, 2) NOT NULL,
    approved_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    disbursed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'disbursed', 'transacted', 'verified')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    receipt_url TEXT,
    verified_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    period VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    realization_summary TEXT NOT NULL,
    finance_summary TEXT NOT NULL,
    evaluation_constraints TEXT NOT NULL,
    evaluation_lessons TEXT NOT NULL,
    evaluation_recommendations TEXT NOT NULL,
    documentation_urls JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'revised', 'approved', 'archived')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    revision_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Tasks Table (Follow-up Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    pic_name VARCHAR(255) NOT NULL,
    pic_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    deadline DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'pending_verification', 'revised', 'completed')),
    completion_notes TEXT,
    verification_notes TEXT,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_resource VARCHAR(100),
    related_id VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Audit Logs Table (Permanen)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    organization_name VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at);

-- Multi-Org Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read/Write Organizations" ON organizations FOR ALL USING (true);
CREATE POLICY "Public Read/Write Roles" ON roles FOR ALL USING (true);
CREATE POLICY "Public Read/Write Memberships" ON organization_memberships FOR ALL USING (true);
CREATE POLICY "Public Read/Write Programs" ON programs FOR ALL USING (true);
CREATE POLICY "Public Read/Write Agendas" ON agendas FOR ALL USING (true);
CREATE POLICY "Public Read/Write Performances" ON performances FOR ALL USING (true);
CREATE POLICY "Public Read/Write Budgets" ON budgets FOR ALL USING (true);
CREATE POLICY "Public Read/Write Transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Public Read/Write Reports" ON reports FOR ALL USING (true);
CREATE POLICY "Public Read/Write Tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Public Read/Write Notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Public Read/Write AuditLogs" ON audit_logs FOR ALL USING (true);
