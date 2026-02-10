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
        IMAGE_NAME = "amanadhikari49/cicd"
        VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'dev'}"
        PROD_TAG = "prod"

        DOCKERHUB_CRED = credentials('dockerhub-creds')

        PROD_SERVER = "ec2-13-201-93-178.ap-south-1.compute.amazonaws.com"
        PROD_URL = "http://ec2-13-201-93-178.ap-south-1.compute.amazonaws.com"
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
                    docker login -u "$DOCKERHUB_CRED_USR" -p $DOCKERHUB_CRED_PSW
                    docker push ${IMAGE_NAME}:${VERSION}
                """
            }
        }

        // ========================
        // 2) PROMOTE STAGE
        // ========================
        stage('PROMOTE') {
            // when {
            //     branch 'main'
            // }

            steps {
                echo "🚀 PROMOTE: Promoting artifact to production"

                sh """
                    docker pull ${IMAGE_NAME}:${VERSION}
                    docker tag ${IMAGE_NAME}:${VERSION} ${IMAGE_NAME}:${PROD_TAG}
                    docker push ${IMAGE_NAME}:${PROD_TAG}
                """

                echo "📦 Deploying to production..."

                withCredentials([sshUserPrivateKey(
                    credentialsId: 'prod-ssh-key',
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh """
                        chmod 600 $SSH_KEY
                        ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SSH_USER@${PROD_SERVER} '
                            echo "🟢 Checking running containers..."
                            docker ps
                            
                            echo "⬇️ Pulling latest prod image..."
                            docker pull amanadhikari49/cicd:${PROD_TAG}
                            
                            echo "🛑 Stopping existing container (if any)..."
                            docker stop cicd || true
                            docker rm cicd || true
                            
                            echo "▶️ Starting new container from prod image..."
                            docker run -d \\
                                --name cicd \\
                                --restart unless-stopped \\
                                -p 3000:3000 \\
                                -e NODE_ENV=production \\
                                amanadhikari49/cicd:${PROD_TAG}
                            
                            echo "✅ Deployment complete"
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
                            docker ps --filter name=cicd
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
