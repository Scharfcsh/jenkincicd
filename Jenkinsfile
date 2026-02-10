pipeline {
    agent any
    tools {
        nodejs 'Node24'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    environment {
        IMAGE_NAME = "yourdockerhubuser/next-app"
        VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'dev'}"
        PROD_TAG = "prod"

        DOCKERHUB_CRED = credentials('dockerhub-creds')

        PROD_SERVER = "ubuntu@your.prod.server.ip"
        PROD_URL = "http://your.prod.server.ip"
    }

    stages {
        stage('CHECK_VERSION') {
            steps {
                sh "node -v"
                sh "npm -v"
                sh "docker --version"
            }
        }

        // ========================
        // 1) BUILD STAGE
        // ========================
        stage('BUILD') {
            steps {
                echo "🚧 BUILD: Creating artifact (Docker image)"

                sh """
                    docker build -t ${IMAGE_NAME}:${VERSION} .
                    echo "$DOCKERHUB_CRED_PSW" | docker login -u "$DOCKERHUB_CRED_USR" --password-stdin
                    docker push ${IMAGE_NAME}:${VERSION}
                """
            }
        }

        // ========================
        // 2) PROMOTE STAGE
        // ========================
        stage('PROMOTE') {
            when {
                branch 'main'
            }

            steps {
                echo "🚀 PROMOTE: Promoting artifact to production"

                sh """
                    docker pull ${IMAGE_NAME}:${VERSION}
                    docker tag ${IMAGE_NAME}:${VERSION} ${IMAGE_NAME}:${PROD_TAG}
                    docker push ${IMAGE_NAME}:${PROD_TAG}
                """

                echo "📦 Deploying to production..."

                sshagent(['prod-server-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${PROD_SERVER} '
                            docker pull ${IMAGE_NAME}:${PROD_TAG}
                            docker stop next-app || true
                            docker rm next-app || true
                            docker run -d \\
                                --name next-app \\
                                --restart unless-stopped \\
                                -p 80:3000 \\
                                -e NODE_ENV=production \\
                                ${IMAGE_NAME}:${PROD_TAG}
                        '
                    """
                }
            }
        }

        // ========================
        // 3) STATUS STAGE
        // ========================
        stage('STATUS') {
            when {
                branch 'main'
            }

            steps {
                echo "📡 STATUS: Verifying latest artifact"

                // App health
                sh "curl -f ${PROD_URL} || exit 1"

                // Container status
                sshagent(['prod-server-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${PROD_SERVER} '
                            docker ps --filter name=next-app
                        '
                    """
                }

                echo "✅ Latest artifact is live and healthy"
            }
        }
    }

    post {
        success {
            echo "✅ CI/CD SUCCESS | Artifact: ${IMAGE_NAME}:${VERSION}"
        }
        failure {
            echo "❌ CI/CD FAILED | Artifact: ${IMAGE_NAME}:${VERSION}"
        }
        cleanup {
            sh '''
                docker logout || true
                docker system prune -f || true
            '''
        }
    }
}
