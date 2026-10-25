import urllib.request
import json
import time

PAGE_ID = "1454740611044963"
PAGE_TOKEN = "EAGVJejn6LZAgBSwOKZCX0MFZBkKEHFPTwaUZBex4cC3odbX6WtOCXhAIxV6AE08FAGhnsQgflhWm8sBAP6k58zUoa07OFDCCO53CnfnEG4ZBk7gGf8Y0IKvnn4JOvQFSLJfBOyTgjitx8FshB4VaZBZBrN8GZCJLIZC4Ocnj1UVQqv6w474cO0VW0jy2Rd4Eso72mCUwOzsXsNt0YOZB8rik2fXc9Uw1utjmUoc5Eh4jYZD"

post_message = (
    "🌿 Fresh Botanical Update!\n\n"
    "Elevate your living space with vibrant greenery and natural energy. "
    "A touch of nature brings tranquility to every corner of your home. 🪴✨\n\n"
    "#FlowerPlant #UrbanJungle #IndoorPlants #PlantCare #HomeDecor"
)

image_url = "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1200&q=80"

print("Publishing Live Demo Post to Facebook Page 'Flower plant'...")
url = f"https://graph.facebook.com/v19.0/{PAGE_ID}/photos"

payload = json.dumps({
    "caption": post_message,
    "url": image_url
}).encode("utf-8")

req = urllib.request.Request(
    url,
    data=payload,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {PAGE_TOKEN}"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        print("\nSUCCESS! Post Published Successfully.")
        print(f"Photo ID: {res_data.get('id')}")
        print(f"Facebook Post ID: {res_data.get('post_id')}")
        print(f"Live URL: https://facebook.com/{res_data.get('post_id')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode("utf-8"))
except Exception as e:
    print(f"Error: {e}")
