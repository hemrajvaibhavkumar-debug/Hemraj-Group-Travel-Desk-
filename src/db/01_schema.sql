-- Setup database schema for Hemraj Group Personal Travel Desk

-- 1. Employees Master Table
CREATE TABLE employees (
    employee_code VARCHAR(50) PRIMARY KEY,
    aadhar_pan_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    default_travel_approver VARCHAR(255) NOT NULL,
    approver_designation VARCHAR(100) NOT NULL,
    cost_centre VARCHAR(100) NOT NULL,
    default_billing_currency VARCHAR(10) NOT NULL CHECK (default_billing_currency IN ('INR', 'USD', 'NGN')),
    
    -- Domestic Profile Fields
    native_city VARCHAR(100),
    nearest_airport VARCHAR(100),
    nearest_railway_station VARCHAR(100),
    default_mode_of_transport VARCHAR(50),
    extra_baggage_required BOOLEAN,
    photograph_url TEXT,
    supporting_documents_url TEXT,
    
    -- International Profile Fields
    present_location_abroad VARCHAR(255),
    assigned_plant_site VARCHAR(100) CHECK (assigned_plant_site IN ('Sunagrow', 'Ricefield', 'Other')),
    nearest_airport_india VARCHAR(100),
    passport_number VARCHAR(100),
    passport_issue_date DATE,
    passport_expiry DATE,
    passport_front_page_url TEXT,
    passport_back_page_url TEXT,
    offer_letter_url TEXT,
    polio_vaccine_status VARCHAR(100) CHECK (polio_vaccine_status IN ('Vaccinated', 'Not Vaccinated', 'Pending')),
    polio_certificate_expiry DATE,
    yfv_status VARCHAR(100) CHECK (yfv_status IN ('Vaccinated', 'Not Vaccinated', 'Pending')),
    yfv_certificate_expiry DATE,
    visa_number VARCHAR(100),
    visa_expiry_date DATE,
    visa_country VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Travel Indents Table
CREATE TABLE travel_indents (
    id VARCHAR(50) PRIMARY KEY,
    travel_type VARCHAR(100) NOT NULL CHECK (travel_type IN ('DOMESTIC', 'INTERNATIONAL', 'INTERNATIONAL_RETURN', 'SL', 'LOCAL')),
    gst_applicable BOOLEAN NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    travel_date DATE NOT NULL,
    wp_number VARCHAR(100),
    nearest_boarding_point VARCHAR(255) NOT NULL,
    luggage VARCHAR(150),
    visa_type VARCHAR(150),
    seat_preference VARCHAR(150),
    meal_preference VARCHAR(150),
    source_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    
    -- Foreign key to employees master
    employee_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee FOREIGN KEY (employee_code) REFERENCES employees(employee_code) ON DELETE CASCADE
);
