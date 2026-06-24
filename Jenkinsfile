pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Show Workspace') {
            steps {
                sh '''
                pwd
                ls -la
                '''
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh '''
                docker compose down || true
                '''
            }
        }

        stage('Build Application') {
            steps {
                sh '''
                docker compose build
                '''
            }
        }

        stage('Deploy Application') {
            steps {
                sh '''
                docker compose up -d
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                docker ps
                docker compose ps
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful'
        }

        failure {
            echo 'Deployment Failed'
        }
    }
}
