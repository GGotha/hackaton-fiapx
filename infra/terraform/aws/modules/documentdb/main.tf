# Amazon DocumentDB — MongoDB-compatible managed cluster backing the auth
# service's better-auth identity store. Mirrors the rds module: private subnet
# group, a security group that only admits the cluster workloads, an encrypted
# cluster, and one or more instances.

resource "aws_docdb_subnet_group" "this" {
  name       = "${var.name}-docdb"
  subnet_ids = var.subnet_ids
  tags       = merge(var.tags, { Name = "${var.name}-docdb" })
}

resource "aws_security_group" "this" {
  name        = "${var.name}-docdb"
  description = "DocumentDB (MongoDB-compatible) access for FIAP X"
  vpc_id      = var.vpc_id
  tags        = merge(var.tags, { Name = "${var.name}-docdb" })
}

resource "aws_vpc_security_group_ingress_rule" "docdb" {
  count = length(var.ingress_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = var.ingress_security_group_ids[count.index]
  from_port                    = 27017
  to_port                      = 27017
  ip_protocol                  = "tcp"
  description                  = "DocumentDB from cluster workloads"
}

resource "aws_docdb_cluster" "this" {
  cluster_identifier = "${var.name}-docdb"
  engine             = "docdb"
  engine_version     = var.engine_version

  master_username = var.username
  master_password = var.password
  port            = 27017

  db_subnet_group_name   = aws_docdb_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]

  storage_encrypted = true

  backup_retention_period   = var.backup_retention_period
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name}-docdb-final"

  tags = merge(var.tags, { Name = "${var.name}-docdb" })
}

resource "aws_docdb_cluster_instance" "this" {
  count = var.instance_count

  identifier         = "${var.name}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.this.id
  instance_class     = var.instance_class

  auto_minor_version_upgrade = true

  tags = merge(var.tags, { Name = "${var.name}-docdb-${count.index}" })
}
