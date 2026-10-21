from app.core.security import (
    gerar_codigo_recuperacao,
    gerar_hash_codigo_recuperacao,
    verificar_codigo_recuperacao,
)


def test_codigo_recuperacao_tem_seis_digitos():
    codigo = gerar_codigo_recuperacao()

    assert len(codigo) == 6
    assert codigo.isdigit()


def test_hash_e_validacao_do_codigo_recuperacao():
    codigo = "583241"

    codigo_hash = gerar_hash_codigo_recuperacao(codigo)

    assert codigo_hash != codigo
    assert verificar_codigo_recuperacao(codigo, codigo_hash) is True
    assert verificar_codigo_recuperacao("111111", codigo_hash) is False
