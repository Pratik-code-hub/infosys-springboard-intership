import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")
supabase: Client = create_client(url, key)

users_to_create = [
    {"email": "pratik.admin@arogyapulse.ai", "password": "Password@123", "role": "admin", "name": "Pratik Sharma (System Director)"},
    {"email": "dr.ananya@arogyapulse.ai", "password": "Password@123", "role": "doctor", "name": "Dr. Ananya Iyer (Cardiology)"},
    {"email": "dr.rajesh@arogyapulse.ai", "password": "Password@123", "role": "doctor", "name": "Dr. Rajesh Mehta (General Medicine)"},
    {"email": "aarav.verma@gmail.com", "password": "Password@123", "role": "patient", "name": "Aarav Verma (Patient)"},
    {"email": "neha.sengupta@gmail.com", "password": "Password@123", "role": "patient", "name": "Neha Sengupta (Patient)"}
]

async def seed_users():
    for u in users_to_create:
        print(f"Creating user {u['email']}...")
        
        # 1. Sign up user
        try:
            res = supabase.auth.sign_up({
                "email": u["email"],
                "password": u["password"],
            })
            print(f"Auth creation result for {u['email']}: {res}")
            
            user_id = res.user.id if res.user else None
            if not user_id:
                # Try signing in if already exists
                login_res = supabase.auth.sign_in_with_password({
                    "email": u["email"],
                    "password": u["password"]
                })
                user_id = login_res.user.id if login_res.user else None
            
            if user_id:
                # 2. Insert into public.users
                profile_res = supabase.table("users").upsert({
                    "id": user_id,
                    "full_name": u["name"],
                    "role": u["role"]
                }).execute()
                print(f"Profile creation result: {profile_res}")
            else:
                print(f"Failed to resolve user ID for {u['email']}")
                
        except Exception as e:
            print(f"Failed to setup {u['email']}: {e}")

if __name__ == "__main__":
    asyncio.run(seed_users())
