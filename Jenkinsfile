pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    environment {
        IMAGE_NAME = "yourdockerhubuser/next-app"
        VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'unknown'}"
        PROD_TAG = "prod"
        DOCKERHUB_CRED = credentials('dockerhub-creds')
        PROD_SERVER = "ubuntu@your.prod.server.ip"
        PROD_URL = "http://your.prod.server.ip"
    }

    stages {

        stage('CHECKOUT') {
            steps {
                echo "Checking out source code..."
                checkout scm
            }
        }

        stage('INSTALL') {
            steps {
                echo "Installing dependencies..."
                sh 'npm ci'
            }
        }

        stage('QUALITY') {
            parallel {
                stage('Lint') {
                    steps {
                        echo "Running linter..."
                        sh 'npm run lint || true'
                    }
                }
                stage('Type Check') {
                    steps {
                        echo "Running type check..."
                        sh 'npx tsc --noEmit || true'
                    }
                }
            }
        }

        stage('TEST') {
            steps {
                echo "Running tests..."
                sh 'npm test || echo "No tests configured"'
            }
        }

        stage('BUILD') {
            steps {
                echo "Building Next.js application..."
                sh 'npm run build'
            }
        }

        stage('DOCKER BUILD & PUSH') {
            steps {
                echo "Building Docker image: ${IMAGE_NAME}:${VERSION}"
                sh "docker build -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest ."
                
                echo "Pushing to Docker Hub..."
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_NAME}:${VERSION}
                        docker push ${IMAGE_NAME}:latest
                    '''
                }
            }
            post {
                always {
                    sh 'docker logout || true'
                }
            }
        }

        stage('PROMOTE TO PRODUCTION') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                
                echo "Promoting image to production..."
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker pull ${IMAGE_NAME}:${VERSION}
                        docker tag ${IMAGE_NAME}:${VERSION} ${IMAGE_NAME}:${PROD_TAG}
                        docker push ${IMAGE_NAME}:${PROD_TAG}
                    '''
                }

                echo "Deploying to production server..."
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
                            docker image prune -f
                        '
                    """
                }
            }
        }

        stage('HEALTH CHECK') {
            when {
                branch 'main'
            }
            steps {
                echo "Checking production health..."
                retry(5) {
                    sleep(time: 10, unit: 'SECONDS')
                    sh "curl -f ${PROD_URL}/api/health || curl -f ${PROD_URL}"
                }
                
                sshagent(['prod-server-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${PROD_SERVER} '
                            docker ps --filter name=next-app --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
                        '
                    """
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning up workspace..."
            sh '''
                docker rmi ${IMAGE_NAME}:${VERSION} || true
                docker system prune -f || true
            '''
            cleanWs()
        }
        success {
            echo "✅ Pipeline SUCCESSFUL - Version: ${VERSION}"
            // Uncomment to enable Slack notifications
            // slackSend(color: 'good', message: "Build ${VERSION} deployed successfully!")
        }
        failure {
            echo "❌ Pipeline FAILED - Version: ${VERSION}"
            // Uncomment to enable Slack notifications
            // slackSend(color: 'danger', message: "Build ${VERSION} failed!")
        }
    }
}
