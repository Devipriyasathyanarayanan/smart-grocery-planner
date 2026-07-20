pipeline {
    agent any

    environment {
        APP_NAME = "smart-grocery-planner"
    }

    triggers {
        pollSCM('H/1 * * * *')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                node -v
                npm -v
                docker --version
                docker compose version
                git --version
                '''
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh 'docker compose down || true'
            }
        }

        stage('Deploy Application') {
            steps {
                sh 'docker compose up -d'
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                sleep 15

                curl http://localhost:4000/api/ingredients
                curl http://localhost:4000/api/recipes
                curl http://localhost:4000/api/list
                '''
            }
        }
    }

    post {

        success {
            echo 'Application deployed successfully!'
        }

        failure {
            echo 'Deployment failed!'
        }

        always {
            sh 'docker ps'
        }
    }
}