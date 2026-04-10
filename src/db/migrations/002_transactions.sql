-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  ref_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,
  network VARCHAR(50),
  phone VARCHAR(20),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  response JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_ref_id ON transactions(ref_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);