from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
import json, os

os.makedirs('output/pdf', exist_ok=True)
schema=json.load(open('evaluation-schema.json',encoding='utf-8'))
blue=colors.HexColor('#204b8f'); cyan=colors.HexColor('#008fc4'); ink=colors.HexColor('#182b4b'); line=colors.HexColor('#dce4ef')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleRH',fontName='Helvetica-Bold',fontSize=21,leading=25,textColor=blue,spaceAfter=8))
styles.add(ParagraphStyle(name='SmallRH',fontName='Helvetica',fontSize=8,leading=11,textColor=ink))
styles.add(ParagraphStyle(name='BodyRH',fontName='Helvetica',fontSize=9,leading=13,textColor=ink))
styles.add(ParagraphStyle(name='SectionRH',fontName='Helvetica-Bold',fontSize=12,leading=16,textColor=blue,spaceBefore=10,spaceAfter=8))
styles.add(ParagraphStyle(name='CenterRH',fontName='Helvetica-Bold',fontSize=9,leading=12,alignment=TA_CENTER,textColor=blue))
def p(t,style='BodyRH'):return Paragraph(t,styles[style])
def header(period,subtitle):
    logo=Image('assets/gestao-rh-logo.jpeg',width=92,height=71)
    t=Table([[logo,[p('AVALIAÇÃO DE EXPERIÊNCIA','TitleRH'),p(f'{period} DIAS  |  {subtitle}','SmallRH')]]],colWidths=[112,403])
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEBELOW',(0,0),(-1,-1),1.5,cyan),('BOTTOMPADDING',(0,0),(-1,-1),14)]))
    return [t,Spacer(1,14)]
def identification():
    rows=[[p('<b>Funcionário:</b> ___________________________________'),p('<b>Empresa:</b> __________________________')],
          [p('<b>Função:</b> _______________________________________'),p('<b>Admissão:</b> ____ / ____ / ________')],
          [p('<b>Unidade / setor:</b> _________________________________'),p('<b>Data da avaliação:</b> ____ / ____ / ________')],
          [p('<b>Formação:</b> _____________________________________'),p('<b>Curso:</b> _____________________________')]]
    t=Table(rows,colWidths=[290,225]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),8)]));return t
def box(title,height):
    t=Table([[p(title,'BodyRH')],['']],colWidths=[515],rowHeights=[24,height]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#edf6fc')),('BOX',(0,0),(-1,-1),.6,line),('VALIGN',(0,0),(-1,-1),'TOP')]));return t
story=[]
for period in [45,90]:
    story+=header(period,'CRITÉRIOS DE ACOMPANHAMENTO')+[identification(),Spacer(1,6),p('Marque apenas uma nota por critério, considerando o período avaliado.','BodyRH'),Spacer(1,8)]
    scale=Table([[p('1 - Abaixo do esperado','SmallRH'),p('2 - Atinge parcialmente','SmallRH')],[p('3 - Atinge o esperado','SmallRH'),p('4 - Acima do esperado','SmallRH')]],colWidths=[257.5,257.5]);scale.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#edf6fc')),('BOTTOMPADDING',(0,0),(-1,-1),7)]));story+=[scale,Spacer(1,12)]
    for group in list(dict.fromkeys(q['group'] for q in schema['questions'])):
        story.append(p(group,'SectionRH'))
        rows=[[p('Critério','SmallRH')]+[p(str(n),'CenterRH') for n in range(1,5)]]
        for q in [q for q in schema['questions'] if q['group']==group]:rows.append([p('<b>'+q['title']+'</b><br/>'+q['text'],'SmallRH')]+['']*4)
        t=Table(rows,colWidths=[411,26,26,26,26]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e4f2fa')),('GRID',(0,0),(-1,-1),.5,line),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,1),(-1,-1),3),('BOTTOMPADDING',(0,1),(-1,-1),3)]));story.append(t)
    story.append(PageBreak());story+=header(period,'PLANO DE DESENVOLVIMENTO E PARECER')
    story += [p('<b>Funcionário:</b> ____________________________________  <b>Empresa:</b> ____________________'),Spacer(1,12),box('Conhecimentos a desenvolver ou aperfeiçoar',55),Spacer(1,10),box('Habilidades a desenvolver ou aperfeiçoar',55),Spacer(1,10),p('Treinamentos e ações recomendados','SectionRH'),p('Tipo: (  ) Interno    (  ) Externo    (  ) Não necessário no momento'),Spacer(1,6),p('Modalidades: (  ) Informática    (  ) Comportamental    (  ) Técnico / operacional'),Spacer(1,8),box('Especifique os treinamentos, ações e orientações',55),Spacer(1,8),p('Parecer do gestor','SectionRH'),p('(  ) Efetivação    (  ) Dispensa    (  ) Acompanhar desenvolvimento'),Spacer(1,8),box('Comentários e exemplos observados',45),Spacer(1,18),p('<b>Avaliador:</b> _____________________________________  <b>Cargo:</b> _____________________'),Spacer(1,13),p('<b>Assinatura do avaliador:</b> ___________________________  <b>Data:</b> ____ / ____ / ________'),Spacer(1,13),p('<b>Ciência do avaliado:</b> ______________________________  <b>Data:</b> ____ / ____ / ________')]
    if period==45:story.append(PageBreak())
def footer(canvas,doc):
    canvas.setStrokeColor(line);canvas.line(40,38,555,38);canvas.setFillColor(blue);canvas.setFont('Helvetica',8);canvas.drawString(40,25,'GESTÃO RH CONSULTORIA  |  Acompanhamento de contratados');canvas.drawRightString(555,25,str(doc.page))
SimpleDocTemplate('output/pdf/Avaliacao_Experiencia_Gestao_RH.pdf',pagesize=A4,rightMargin=40,leftMargin=40,topMargin=30,bottomMargin=50).build(story,onFirstPage=footer,onLaterPages=footer)
