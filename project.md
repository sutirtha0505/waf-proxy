**PROJECT STATEMENT:**
**Project Title:**
**Design and Implementation of an AI-Driven Smart Web Application Firewall (WAF)**
**Project Statement:**
This project presents the design and implementation of a Smart Web Application Firewall (WAF) that integrates machine learning to enhance the detection and prevention of application-layer attacks. A Web Application Firewall operates as a security layer positioned between clients and web applications, where it monitors, filters, and controls incoming and outgoing HTTP/HTTPS traffic to protect against threats such as injection attacks, cross-site scripting (XSS), and other malicious payloads.
Unlike traditional WAFs that rely on static, signature-based or rule-based filtering, the proposed system introduces an AI-driven decision engine within the WAF request-processing pipeline. All incoming HTTP/HTTPS requests are first intercepted by the WAF, where they undergo preprocessing and feature extraction before being passed to a trained machine learning model.
The model analyzes each request and produces (i) a classification indicating whether the request is benign or malicious, along with the probable attack vector, and (ii) a confidence score representing the certainty of the prediction. Based on this output, the WAF enforces security policies in real time. If the confidence score exceeds a predefined threshold (e.g., 85%), the WAF autonomously decides to either allow the request to reach the backend application or block it to prevent potential exploitation.
For requests with confidence scores below the threshold, the WAF adopts a human-in-the-loop approach. These requests, along with the model’s predictions and metadata, are forwarded to a human supervisor for further analysis. The supervisor’s decision—whether to allow or block the request—is logged and stored in a centralized database as labeled data.
The system incorporates a continuous learning mechanism whereby the collected and verified data is used to periodically retrain the machine learning model (e.g., on a weekly basis). During retraining, the existing model remains actively deployed within the WAF to ensure uninterrupted traffic filtering. The newly trained model is subjected to validation procedures, including performance benchmarking and reliability checks. Upon successful validation, a version-controlled deployment strategy is employed to seamlessly replace the existing model with the updated version, ensuring zero downtime and consistent protection.
By embedding adaptive intelligence directly into the WAF layer, the proposed system enhances the ability to detect previously unseen attack patterns, reduces dependence on manually maintained rule sets, and improves overall web application security while maintaining high availability.

**Objectives:**

- To design a WAF that integrates AI-based request inspection within the traffic filtering pipeline
- To enable real-time, adaptive detection and mitigation of web application attacks
- To incorporate human-assisted validation for uncertain or ambiguous cases
- To implement a continuous learning framework for evolving threat landscapes
- To ensure robust, zero-downtime deployment through model versioning and validation

**OUR GOAL:**
We aim to present this project at the Synchronicity S2, which will be held at Jadavpur University on 30th–31st May 2026.

**TEAM MEMBERS AND THEIR RESPONSIBILITIES:**

1. **Tirtharaj Karmakar:** He is the cybersecurity specialist of the team. He is responsible for the WAF component and will also guide the AI system developer in building the retraining pipeline, contributing from a DevOps perspective.
2. **Sagnik Bose:** He is the AI/ML system developer. He is responsible for designing and implementing the complete AI/ML workflow for the project.
3. **Sayntan Biswas:** He is the backend developer. He typically develops backend systems using FastAPI, but can adapt to other technology stacks if required.
4. **Shytashma Adhikari:** She is the assistant AI developer. She will be responsible for dataset creation and data preparation.
5. **Mouli Biswas:** She is the frontend developer. She will be responsible for designing and implementing the frontend components.

**WORKFLOW:**

Our WAF will sit between the client and the server, similar to SafeLine WAF. Users will first configure the WAF using our TUI (Text-based User Interface). During setup, they can create a username and password, which will be securely stored in a local SQLite database.

Once the setup is complete, the user can start the WAF using our CLI command. When the WAF starts, it will launch a web server and provide a URL for the web dashboard.

When someone opens that URL in a browser, they will see a login page. To access the admin panel, they must enter the correct username and password that were created during the setup process.

For our hackathon project, we have deployed Damn Vulnerable Web Application using Docker. Our WAF will be placed in front of the DVWA setup to protect it from malicious requests and common web attacks.

After setting up the protection layer, we will perform different security tests on the DVWA environment to check how effectively our WAF can detect and block attacks.

When a client sends a request, the request will first pass through our WAF. The WAF will analyze the incoming request and convert its details into a structured JSON format like this:

```json
{
  "request_id": "uuid",
  "timestamp": 1746123456789,
  "source_ip": "203.0.113.42",
  "protocol": "HTTP/1.1",
  "method": "POST",
  "path": "/login",
  "query_string": "",
  "user_agent": "sqlmap/1.7.8",
  "cookie": "",
  "body_raw": "username=admin&password=' OR '1'='1",
  "content_type": "application/x-www-form-urlencoded",
  "has_encoded_chars": false,
  "has_script_tag": false,
  "path_depth": 1
}
```

This JSON contains important request information such as the request method, URL path, user agent, request body, and other security-related metadata.

After creating the JSON object, the WAF will send it to our AI engine. The AI engine will analyze the request data to detect suspicious or malicious activities such as SQL injection, XSS attempts, bot traffic, or other web attacks.

To communicate with the AI engine, our system will use two API endpoints:

1. **Check Health Endpoint**
   This endpoint is used to verify whether the AI engine is currently active and running properly. Before sending any request data for analysis, the WAF will first call this endpoint to ensure that the AI service is available.

2. **Detect Request Endpoint**
   After receiving a successful response from the health check endpoint, the WAF will send the generated JSON request data to the detect request endpoint. The AI engine will then analyze the request using our custom-trained BERT model to determine whether the request is a possible attack vector or legitimate traffic.

Based on the AI model’s prediction, the WAF can take actions such as allowing, blocking, or flagging the request for further monitoring.

Our AI engine uses a custom-trained BERT model for multi-class classification. The model is trained on our own custom dataset containing different types of web requests and attack patterns.

When the WAF sends the generated JSON data to the AI engine, the BERT model analyzes the request and classifies it into different categories such as normal traffic, SQL injection, XSS, bot traffic, and other malicious activities. Based on the prediction result, the WAF can decide whether to allow, block, or flag the request.

When the WAF sends the generated JSON data to the AI engine through the detect request endpoint, the AI engine first converts the JSON into a structured string format for model processing, like this:

```text
method | protocol | path | query_string | body_raw | content_type | user_agent (if exists) | cookie | path_depth | source_ip | timestamp | request_id | has_encoded_chars | has_script_tag
```

This formatted string is then passed to our custom-trained BERT model for analysis.

For efficient bulk processing, the AI engine returns a response in JSON format containing:

- `request_id`
- `attack_vector`
- `confidence_score`

Example:

```json
{
  "request_id": "uuid",
  "attack_vector": "SQL Injection",
  "confidence_score": 92.4
}
```

After receiving the response, the WAF checks the confidence score:

- If the confidence score is above **85%**, the WAF automatically decides whether to allow or block the request based on the predicted attack type.
- If the confidence score is below **85%**, the request is forwarded to a human supervisor for manual review.

To do this, the WAF sends the request data to another endpoint called **send request to admin**. Under the hood, this endpoint stores the request information in the database so it can appear in the admin panel for review.

After storing the request, the endpoint returns either:

- a success response if the data was stored correctly, or
- a failure response if an error occurred.

The admin panel contains two tabs for managing and reviewing requests.

1. Requests tab: The first tab of the admin panel is called **Requests**. This tab displays all requests that were forwarded by the WAF for manual review because their AI confidence score was below 85%.

The frontend periodically calls an endpoint called **check DB length** to get the current number of pending request records stored in the database. It then compares this value with the number of requests currently displayed in the frontend list.

- If both lengths are the same, no update is needed.
- If the lengths are different, the frontend automatically refreshes the request list.

Each request item in the list only shows the `request_id`.

When the supervisor clicks on a request ID, a popup window appears showing the full JSON data of that request. The popup contains two buttons:

- **Safe**
- **Unsafe**

### If the supervisor clicks “Safe”

The frontend calls an endpoint called **save in DB**.

The backend will:

1. Convert the JSON request into the BERT-compatible string format.
2. Save the formatted request in the dataset/deque.
3. Store the label:
   - Attack vector name: `safe`
   - Attack vector code: `0`

This helps generate labeled training data for future model improvement.

### If the supervisor clicks “Unsafe”

Another popup appears showing the list of supported attack vectors for multi-class classification.

The available attack vectors and their associated codes are:

```text id="fs2ikc"
sql_injection
  - sqli_classic (1)
  - sqli_blind_boolean (2)
  - sqli_blind_time (3)
  - sqli_error_based (4)
  - sqli_union (5)
  - sqli_out_of_band (6)

cross_site_scripting
  - xss_reflected (7)
  - xss_stored (8)
  - xss_dom (9)
  - xss_mutation (10)

command_injection
  - cmdi (11)
  - cmdi_blind (12)

other_injection
  - ssti (13)
  - ldap_injection (14)
  - xml_injection (15)
  - http_header_injection (16)

file_based
  - lfi (17)
  - path_traversal (18)
  - rfi (19)

request_forgery_redirect
  - ssrf (20)
  - csrf (21)
  - open_redirect (22)

auth_session
  - brute_force (23)
  - session_hijacking (24)
  - jwt_manipulation (25)

web_specific
  - rce (26)
  - xxe (27)
  - insecure_deserialization (28)
  - http_request_smuggling (29)
  - business_logic_abuse (30)

dos_layer7
  - http_flood (31)
  - slowloris (32)
  - redos (33)

evasion
  - evasion_encoding (34)
  - evasion_case_whitespace (35)
  - evasion_null_byte (36)
  - http_parameter_pollution (37)
```

When the supervisor selects an attack vector:

1. The JSON request is converted into the required BERT string format.
2. The formatted request is stored in the deque/database.
3. The selected attack vector name and associated numeric label are stored along with the request.

The supervisor can also choose **Add New Attack Vector**.

In that case:

1. The supervisor enters:
   - a new attack vector category
   - a new attack vector name

2. The system calculates the current highest attack vector code.
3. A new numeric code is generated automatically using the next available number.
4. The new attack vector definition and labeled request are then saved through the corresponding backend endpoint.

**OUR STACK:**
