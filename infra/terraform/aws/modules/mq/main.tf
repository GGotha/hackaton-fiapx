locals {
  # SINGLE_INSTANCE requires exactly one subnet; the multi-AZ cluster requires two.
  broker_subnet_ids = var.deployment_mode == "SINGLE_INSTANCE" ? [var.subnet_ids[0]] : slice(var.subnet_ids, 0, 2)
}

resource "aws_security_group" "this" {
  name        = "${var.name}-mq"
  description = "RabbitMQ (Amazon MQ) access for FIAP X"
  vpc_id      = var.vpc_id
  tags        = merge(var.tags, { Name = "${var.name}-mq" })
}

resource "aws_vpc_security_group_ingress_rule" "amqps" {
  count = length(var.ingress_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = var.ingress_security_group_ids[count.index]
  from_port                    = 5671
  to_port                      = 5671
  ip_protocol                  = "tcp"
  description                  = "AMQPS from cluster workloads"
}

resource "aws_vpc_security_group_ingress_rule" "management" {
  count = length(var.ingress_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = var.ingress_security_group_ids[count.index]
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  description                  = "Management console/API from cluster workloads"
}

resource "aws_mq_broker" "this" {
  broker_name = "${var.name}-rabbitmq"

  engine_type        = "RabbitMQ"
  engine_version     = var.engine_version
  host_instance_type = var.host_instance_type
  deployment_mode    = var.deployment_mode

  subnet_ids          = local.broker_subnet_ids
  security_groups     = [aws_security_group.this.id]
  publicly_accessible = false

  auto_minor_version_upgrade = true

  user {
    username = var.username
    password = var.password
  }

  tags = merge(var.tags, { Name = "${var.name}-rabbitmq" })
}
