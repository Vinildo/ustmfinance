import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://axofggykwirdyjekapns.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4b2ZnZ3lrd2lyZHlqZWthcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDY5MzAsImV4cCI6MjA1NzgyMjkzMH0.aa3wgoH3RfdfOjU9moL8HEWLZMbTNSxxftbCcYmT2E0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
