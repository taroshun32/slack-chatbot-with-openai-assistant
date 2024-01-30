resource "aws_dynamodb_table" "openai_thread" {
  name     = "openai_thread"
  hash_key = "threadTs"

  read_capacity  = 1
  write_capacity = 1

  attribute {
    name = "threadTs"
    type = "S"
  }

  ttl {
    attribute_name = "expiration"
    enabled        = true
  }
}
