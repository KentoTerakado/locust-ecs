#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LocustStack } from '../lib/locust-stack';

const app = new cdk.App();
new LocustStack(app, 'LocustStack', {
});
