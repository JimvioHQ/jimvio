const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('community_inbox_conversations').select('*').limit(1);
  console.log('Conversation columns:', data ? Object.keys(data[0]) : 'no data');
  if (error) console.error(error);
}

check();
