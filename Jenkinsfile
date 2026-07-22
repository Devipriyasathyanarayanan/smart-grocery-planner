// pipeline {
//     agent any

//     environment {
//         APP_NAME    = "my-app/test"
//         AWS_REGION  = "us-east-1"                                   // your actual region
//         AWS_ACCOUNT_ID = "005696749434"                              // your actual account ID
//         ECR_REPO    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"
//         IMAGE_TAG   = "${env.BUILD_NUMBER}"
//         EC2_HOST    = "44.202.204.100"                                // your EC2 public IP
//         EC2_USER    = "ubuntu"                                       // or ec2-user, whichever your AMI uses
//     }

//     triggers {
//         pollSCM('* * * * *')
//     }

//     stages {

//         stage('Checkout') {
//             steps {
//                 checkout scm
//             }
//         }

//         stage('Verify Tools') {
//             steps {
//                 sh '''
//                 node -v
//                 npm -v
//                 docker --version
//                 docker compose version
//                 git --version
//                 '''
//             }
//         }

//         stage('Install Backend Dependencies') {
//             steps {
//                 dir('backend') {
//                     sh 'npm install'
//                 }
//             }
//         }

//         stage('Build Docker Images') {
//             steps {
//                 sh 'docker compose build'
//             }
//         }

//         stage('Tag Backend Image for ECR') {
//             steps {
//                 // replace 'backend' with whatever your compose service/image is actually called
//                 // check with: docker images   (right after the build stage runs once, to confirm the name)
//                 sh "docker tag ${APP_NAME}-backend:latest ${ECR_REPO}:${IMAGE_TAG}"
//                 sh "docker tag ${APP_NAME}-backend:latest ${ECR_REPO}:latest"
//             }
//         }

//         stage('Push to ECR') {
//             steps {
//                 withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-ecr-creds']]) {
//                     sh """
//                         aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
//                         docker push ${ECR_REPO}:${IMAGE_TAG}
//                         docker push ${ECR_REPO}:latest
//                     """
//                 }
//             }
//         }

//         stage('Deploy to EC2') {
//             steps {
//                 sshagent(credentials: ['ec2-ssh-key']) {
//                     sh """
//                         ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
//                             aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO} &&
//                             docker pull ${ECR_REPO}:${IMAGE_TAG} &&
//                             docker stop app-container || true &&
//                             docker rm app-container || true &&
//                             docker run -d --name app-container -p 4000:4000 ${ECR_REPO}:${IMAGE_TAG}
//                         '
//                     """
//                 }
//             }
//         }

//         stage('Health Check') {
//             steps {
//                 sh '''
//                 sleep 15
//                 curl http://''' + "${EC2_HOST}" + ''':4000/api/ingredients
//                 curl http://''' + "${EC2_HOST}" + ''':4000/api/recipes
//                 curl http://''' + "${EC2_HOST}" + ''':4000/api/list
//                 '''
//             }
//         }
//     }

//     post {
//         success {
//             echo 'Application deployed successfully!'
//         }
//         failure {
//             echo 'Deployment failed!'
//         }
//         always {
//             sh 'docker ps'
//         }
//     }
// }



































pipeline {
    agent any

    environment {
        APP_NAME       = "smart-grocery-planner"
        AWS_REGION     = "us-east-1"                                 // your actual region
        AWS_ACCOUNT_ID = "005696749434"                              // your actual account ID
        ECR_REPO       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"
        IMAGE_TAG      = "${BUILD_NUMBER}"
        EC2_HOST       = "44.202.204.100"                            // your EC2 public IP
        EC2_USER       = "ec2-user"                                  // MUST match the user baked into your ec2-ssh-key credential
                                                                      // ubuntu AMI -> "ubuntu", Amazon Linux AMI -> "ec2-user"
    }

    triggers {
        pollSCM('* * * * *')
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

        stage('Tag Backend Image for ECR') {
            steps {
                // Confirm the built image name with `docker images` right after the build
                // stage runs once -- docker compose names images <project>-<service>:latest
                // by default, which may not exactly match ${APP_NAME}-backend.
                sh "docker tag ${APP_NAME}-backend:latest ${ECR_REPO}:${IMAGE_TAG}"
                sh "docker tag ${APP_NAME}-backend:latest ${ECR_REPO}:latest"
            }
        }

        stage('Push to ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-ecr-creds']]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
                        docker push ${ECR_REPO}:${IMAGE_TAG}
                        docker push ${ECR_REPO}:latest
                    """
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                // NOTE: the EC2 instance authenticates to ECR using its own IAM
                // instance profile/role attached to the instance -- the ec2-ssh-key
                // credential only grants SSH access, it does not grant AWS API access.
                // Make sure an instance role with ECR pull permissions is attached to
                // this EC2 instance, or this aws ecr get-login-password call will fail.
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO} &&
                            docker pull ${ECR_REPO}:${IMAGE_TAG} &&
                            docker stop app-container || true &&
                            docker rm app-container || true &&
                            docker run -d --name app-container --restart unless-stopped -p 4000:4000 ${ECR_REPO}:${IMAGE_TAG}
                        '
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sh """
                    sleep 15
                    curl http://${EC2_HOST}:4000/api/ingredients
                    curl http://${EC2_HOST}:4000/api/recipes
                    curl http://${EC2_HOST}:4000/api/list
                """
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
