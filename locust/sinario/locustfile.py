from locust import task, constant_throughput, HttpUser

class SampleUser(HttpUser):
    @task(2)
    def get_request(self):
        value = "value"
        self.client.get(f"/sample?key={value}")

    @task(1)
    def post_request(self):
        self.client.post("/sample", json={"key": "value"})
    wait_time = constant_throughput(1)
    host = 'https://example.com'
