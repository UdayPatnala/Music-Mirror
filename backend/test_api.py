import requests

# Change this if your backend runs on different port
API_URL = "http://127.0.0.1:8000/recommend"

# Test emotions
test_emotions = ["happy", "sad", "angry", "neutral", "surprise"]

for emotion in test_emotions:
    response = requests.post(API_URL, json={"emotion": emotion})
    
    print(f"\nTesting Emotion: {emotion.upper()}")
    
    if response.status_code == 200:
        data = response.json()
        print("Recommended Songs:")
        for song in data.get("songs", []):
            print(f"- {song}")
    else:
        print("Error:", response.status_code)