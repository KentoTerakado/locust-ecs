import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IAMRoleStack } from './nest_stack/iam_role_stack';
import { VPCStack } from './nest_stack/vpc_stack';
import { ECSClusterStack } from './nest_stack/ecs_cluster_stack';
import { ECSServiceStack } from './nest_stack/ecs_service_stack';

export class LocustStack extends cdk.Stack {
  public readonly vpc: VPCStack;
  public readonly iam: IAMRoleStack;
  public readonly ecscluster: ECSClusterStack;
  public readonly ecsServiceStack: ECSServiceStack;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.iam = new IAMRoleStack(this, 'IAMStack', {
      stackName: `locust-iam-role-stack`,
      ...props,
    });

    this.vpc = new VPCStack(this, 'VPCStack', {
      stackName: `locust-vpc-stack`,
      ...props,
    });

    this.ecscluster = new ECSClusterStack(this, 'ECSStack', {
      stackName: 'locust-cluster-stack',
      ...props,
    }, this.vpc.vpc); 
    this.ecscluster.node.addDependency(this.vpc);

    this.ecsServiceStack = new ECSServiceStack(this, 'ECSServiceStackMaster', {
      stackName: 'locust-service-stack-master',
      ...props,
    }, {
      vpc: this.vpc.vpc,
      cluster: this.ecscluster.cluster,
      ecs_sg: this.vpc.ecs_sg,
      alb_sg: this.vpc.alb_sg,
      taskRole: this.iam.taskRole,
      executionRole: this.iam.executionRole,
      logGroup: this.ecscluster.logGroup,
      repository: this.ecscluster.repository,
      namespace: this.ecscluster.namespace,
      type: 'master',
    });
    this.ecsServiceStack.node.addDependency(this.ecscluster);

    const ecsServiceStackSlave = new ECSServiceStack(this, 'ECSServiceStackSlave', {
      stackName: 'locust-service-stack-slave',
      ...props,
    }, {
      vpc: this.vpc.vpc,
      cluster: this.ecscluster.cluster,
      ecs_sg: this.vpc.ecs_sg,
      alb_sg: this.vpc.alb_sg,
      taskRole: this.iam.taskRole,
      executionRole: this.iam.executionRole,
      logGroup: this.ecscluster.logGroup,
      repository: this.ecscluster.repository,
      namespace: this.ecscluster.namespace,
      type: 'slave',
    }).node.addDependency(this.ecscluster);
  }
}

const app = new cdk.App();
new LocustStack(app, 'LocustStack');
