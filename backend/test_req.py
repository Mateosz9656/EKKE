import urllib.request, urllib.error
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/chat',
    data=b'{"prompt":"teszt","task_id":4,"session_id":1}',
    headers={'Content-Type': 'application/json'},
    method='POST'
)
try:
    print(urllib.request.urlopen(req).read())
except urllib.error.HTTPError as e:
    print("ERROR:", e.code, e.reason)
    print("BODY:", e.read())
