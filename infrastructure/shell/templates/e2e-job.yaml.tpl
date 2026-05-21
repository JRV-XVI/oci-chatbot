apiVersion: batch/v1
kind: Job
metadata:
  name: ${JOB_NAME}
  namespace: ${JOB_NAMESPACE}
  labels:
    app: forgetask-e2e
    component: test-runner
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 3600
  activeDeadlineSeconds: 2700
  template:
    metadata:
      labels:
        app: forgetask-e2e
        component: test-runner
    spec:
      restartPolicy: Never
      containers:
        - name: pytest-runner
          image: ${TEST_IMAGE}
          imagePullPolicy: Always
          env:
            - name: E2E_BROWSER
              value: "chrome"
            - name: E2E_HEADLESS
              value: "true"
            - name: E2E_TIMEOUT_SECONDS
              value: "${E2E_TIMEOUT_SECONDS}"
            - name: E2E_SELENIUM_TIMEOUT
              value: "${E2E_SELENIUM_TIMEOUT}"
            - name: E2E_ARTIFACTS_DIR
              value: "/app/tests/selenium/artifacts"
            - name: TARGET_NAMESPACE
              value: "${TARGET_NAMESPACE}"
            - name: E2E_BASE_URL
              value: "http://10.244.1.100:3000"
            - name: E2E_API_BASE_URL
              value: "http://forgetask-service.${TARGET_NAMESPACE}.svc.cluster.local:8080"
            - name: E2E_SELENIUM_REMOTE_URL
              value: "http://selenium-hub.mtdrworkshop.svc.cluster.local:4444/wd/hub"
            - name: E2E_LOGIN_EMAIL
              valueFrom:
                secretKeyRef:
                  name: forgetask-e2e-secrets
                  key: E2E_LOGIN_EMAIL
            - name: E2E_LOGIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: forgetask-e2e-secrets
                  key: E2E_LOGIN_PASSWORD
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-credentials
                  key: token
            - name: GITHUB_OWNER
              value: "${GITHUB_OWNER}"
            - name: GITHUB_REPO
              value: "${GITHUB_REPO}"
            - name: GITHUB_PROJECT_ID
              value: "${GITHUB_PROJECT_ID}"