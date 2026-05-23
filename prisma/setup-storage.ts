import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupStorage() {
  const { data, error } = await supabase.storage.createBucket('volunteer-proofs', {
    public: false,
    fileSizeLimit: null,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'image/webp',
    ],
  })

  if (error && error.message !== 'Bucket already exists') {
    console.error('Error creating bucket:', error)
    process.exit(1)
  } else {
    console.log('✅ volunteer-proofs bucket ready')
  }
}

setupStorage()
