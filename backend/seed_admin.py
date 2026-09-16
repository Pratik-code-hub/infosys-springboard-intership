import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client

async def main():
    load_dotenv('.env')
    sb = create_client(os.environ.get('SUPABASE_URL', ''), os.environ.get('SUPABASE_KEY', ''))
    
    email = "pratik.admin@arogyapulse.ai"
    password = "Password@123"
    
    print(f"Creating Superadmin user {email}...")
    try:
        # Create user in Auth
        res = sb.auth.sign_up({"email": email, "password": password})
        if res.user:
            user_id = res.user.id
            print(f"User created with ID {user_id}. Inserting into public.users...")
            
            sb.table("users").upsert({
                "id": user_id,
                "role": "admin",
                "full_name": "Pratik Kumar (System Director)"
            }).execute()
            print("Superadmin user seeded successfully!")
        else:
            print("User already exists or failed to create.", res)
            
            # Try to log in to get ID
            try:
                sign_in_res = sb.auth.sign_in_with_password({"email": email, "password": password})
                user_id = sign_in_res.user.id
                sb.table("users").upsert({
                    "id": user_id,
                    "role": "admin",
                    "full_name": "Pratik Kumar (System Director)"
                }).execute()
                print("Superadmin user role updated successfully!")
            except Exception as e:
                print("Failed to sign in and update role:", e)
            
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(main())
